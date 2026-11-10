import { supabase } from "@/lib/supabase";

export interface PollOption {
  id: number;
  text: string;
  votesCount?: number;
  percentage?: number;
}

export type PollDuration = "24h" | "3d" | "7d";

export interface PollData {
  id?: string;
  question?: string;
  options: PollOption[];
  duration: PollDuration;
  expiresAt: string; // ISO date string
  createdAt?: string;
  totalVotes?: number;
  userVotedOptionId?: number | null;
  isExpired?: boolean;
}

/**
 * Calculates expiration date from duration
 */
export function calculatePollExpiration(duration: PollDuration, startDate: Date = new Date()): Date {
  const expires = new Date(startDate.getTime());
  switch (duration) {
    case "24h":
      expires.setHours(expires.getHours() + 24);
      break;
    case "3d":
      expires.setDate(expires.getDate() + 3);
      break;
    case "7d":
      expires.setDate(expires.getDate() + 7);
      break;
    default:
      expires.setHours(expires.getHours() + 24);
  }
  return expires;
}

/**
 * Formats time remaining for a poll
 */
export function formatPollTimeRemaining(expiresAt: string): { text: string; isExpired: boolean } {
  const now = Date.now();
  const expireTime = new Date(expiresAt).getTime();
  const diffMs = expireTime - now;

  if (diffMs <= 0) {
    return { text: "Final results", isExpired: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 1) {
    return { text: `${days} days left`, isExpired: false };
  }
  if (days === 1) {
    return { text: "1 day left", isExpired: false };
  }
  if (hours > 1) {
    return { text: `${hours} hours left`, isExpired: false };
  }
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return { text: `${minutes}m left`, isExpired: false };
}

/**
 * Serializes poll configuration into a post file URL
 */
export function serializePollData(poll: {
  question?: string;
  options: { id: number; text: string }[];
  duration: PollDuration;
}): string {
  const expiresAt = calculatePollExpiration(poll.duration).toISOString();
  const payload: PollData = {
    options: poll.options.map((o, idx) => ({ id: o.id || idx + 1, text: o.text.trim() })),
    duration: poll.duration,
    expiresAt,
    createdAt: new Date().toISOString(),
    question: poll.question?.trim() || "",
  };
  return `poll://${encodeURIComponent(JSON.stringify(payload))}`;
}

/**
 * Parses poll configuration from a post's file or body
 */
export function parsePollFromPost(post: { file?: string | null; body?: string | null }): PollData | null {
  if (post.file && post.file.startsWith("poll://")) {
    try {
      const raw = post.file.replace("poll://", "");
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      if (parsed && Array.isArray(parsed.options) && parsed.options.length >= 2) {
        return {
          ...parsed,
          isExpired: new Date(parsed.expiresAt).getTime() <= Date.now(),
        };
      }
    } catch (e) {
      console.warn("Failed to parse poll data from post.file:", e);
    }
  }

  if (post.body && post.body.includes("[POLL_DATA:")) {
    try {
      const match = post.body.match(/\[POLL_DATA:(.+?)\]/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        const parsed = JSON.parse(decoded);
        if (parsed && Array.isArray(parsed.options) && parsed.options.length >= 2) {
          return {
            ...parsed,
            isExpired: new Date(parsed.expiresAt).getTime() <= Date.now(),
          };
        }
      }
    } catch (e) {
      console.warn("Failed to parse poll data from post.body:", e);
    }
  }

  return null;
}

/**
 * Fetches poll votes and calculates percentages and user vote status.
 * Voting Privacy: Results are hidden until user votes OR poll expires.
 */
export async function getPollVoteState(
  postId: string,
  poll: PollData,
  currentUserId?: string | null
): Promise<PollData> {
  const isExpired = new Date(poll.expiresAt).getTime() <= Date.now();
  let userVotedOptionId: number | null = null;
  const votesMap: Record<number, number> = {};
  poll.options.forEach((opt) => {
    votesMap[opt.id] = 0;
  });

  // Track user votes to ensure strictly 1 vote per user
  const userVoteRecorded = new Set<string>();

  try {
    // 1. Check dedicated poll_votes table if exists
    const { data: dbVotes, error: dbVoteErr } = await supabase
      .from("poll_votes")
      .select("user_id, option_id")
      .eq("post_id", postId);

    if (!dbVoteErr && dbVotes) {
      dbVotes.forEach((v: any) => {
        if (!userVoteRecorded.has(v.user_id)) {
          userVoteRecorded.add(v.user_id);
          votesMap[v.option_id] = (votesMap[v.option_id] || 0) + 1;
          if (currentUserId && v.user_id === currentUserId) {
            userVotedOptionId = v.option_id;
          }
        }
      });
    }
  } catch {}

  // 2. Also check resilient comment-based votes
  try {
    const { data: commentVotes, error: commentErr } = await supabase
      .from("comments")
      .select("userId, body, created_at")
      .eq("postId", postId)
      .order("created_at", { ascending: true });

    if (!commentErr && commentVotes) {
      commentVotes.forEach((c: any) => {
        if (c.body && c.body.startsWith("[POLL_VOTE:")) {
          const match = c.body.match(/\[POLL_VOTE:(\d+)\]/);
          if (match && match[1]) {
            const optId = parseInt(match[1], 10);
            if (!userVoteRecorded.has(c.userId)) {
              userVoteRecorded.add(c.userId);
              votesMap[optId] = (votesMap[optId] || 0) + 1;
              if (currentUserId && c.userId === currentUserId) {
                userVotedOptionId = optId;
              }
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn("Error reading poll votes:", err);
  }

  const totalVotes = Object.values(votesMap).reduce((acc, count) => acc + count, 0);

  const updatedOptions = poll.options.map((opt) => {
    const count = votesMap[opt.id] || 0;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    return {
      ...opt,
      votesCount: count,
      percentage,
    };
  });

  return {
    ...poll,
    options: updatedOptions,
    totalVotes,
    userVotedOptionId,
    isExpired,
  };
}

/**
 * Casts a vote on a poll.
 * Enforces:
 * - Single & Final Vote: Strictly 1 vote per user, cannot be edited or changed.
 * - Poll expiration check.
 */
export async function voteOnPoll(
  postId: string,
  optionId: number,
  poll: PollData
): Promise<{ success: boolean; error?: string; updatedPoll?: PollData }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { success: false, error: "Please sign in to vote." };
  }

  const userId = userData.user.id;

  // 1. Check expiration
  if (new Date(poll.expiresAt).getTime() <= Date.now()) {
    return { success: false, error: "This poll has expired and is no longer accepting votes." };
  }

  // 2. Check if already voted (Single & Final vote enforcement)
  const currentVotes = await getPollVoteState(postId, poll, userId);
  if (currentVotes.userVotedOptionId !== null && currentVotes.userVotedOptionId !== undefined) {
    return {
      success: false,
      error: "You have already voted on this poll. Votes are final and cannot be changed.",
      updatedPoll: currentVotes,
    };
  }

  // 3. Record vote in Supabase
  try {
    // Attempt insert into poll_votes if table exists
    await supabase.from("poll_votes").insert({
      post_id: postId,
      user_id: userId,
      option_id: optionId,
    });
  } catch {}

  // Also record in comments as resilient fallback
  try {
    await supabase.from("comments").insert({
      postId,
      userId,
      body: `[POLL_VOTE:${optionId}]`,
    });
  } catch (err: any) {
    console.error("Error submitting poll vote comment:", err);
    return { success: false, error: "Failed to record vote: " + (err.message || "Unknown error") };
  }

  // 4. Return updated poll state with user's vote
  const finalState = await getPollVoteState(postId, poll, userId);
  return { success: true, updatedPoll: finalState };
}

