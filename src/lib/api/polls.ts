import { supabase } from "@/lib/supabase";

/**
 * Official Poll Option projection from Section 4 of poll-posts.md
 */
export interface PollOptionView {
  id: string; // decimal string (BigInt)
  position: number;
  label: string;
  votes: number | null; // null if results_visible is false
  percentage: number | null; // null if results_visible is false
}

/**
 * Official Poll projection from Section 4 of poll-posts.md (Migrations 088–090)
 */
export interface PollView {
  post_id: string; // decimal string (BigInt)
  duration_hours: 24 | 72 | 168;
  created_at: string;
  ends_at: string;
  server_time: string;
  is_closed: boolean;
  can_vote: boolean;
  selected_option_id: string | null;
  results_visible: boolean;
  total_votes: number; // Always visible even before voting (Migration 090)
  options: PollOptionView[];
}

export interface PollOption {
  id: number | string;
  text?: string;
  label?: string;
  votesCount?: number | null;
  votes?: number | null;
  percentage?: number | null;
}

export type PollDuration = "24h" | "3d" | "7d" | 24 | 72 | 168;

export interface PollData {
  id?: string;
  post_id?: string;
  question?: string;
  options: (PollOption | PollOptionView)[];
  duration?: PollDuration;
  duration_hours?: 24 | 72 | 168;
  expiresAt?: string;
  ends_at?: string;
  createdAt?: string;
  created_at?: string;
  totalVotes?: number;
  total_votes?: number;
  userVotedOptionId?: number | string | null;
  selected_option_id?: string | null;
  isExpired?: boolean;
  is_closed?: boolean;
  can_vote?: boolean;
  results_visible?: boolean;
}

/**
 * Calculates expiration date from duration
 */
export function calculatePollExpiration(duration: PollDuration, startDate: Date = new Date()): Date {
  const expires = new Date(startDate.getTime());
  switch (duration) {
    case "24h":
    case 24:
      expires.setHours(expires.getHours() + 24);
      break;
    case "3d":
    case 72:
      expires.setDate(expires.getDate() + 3);
      break;
    case "7d":
    case 168:
      expires.setDate(expires.getDate() + 7);
      break;
    default:
      expires.setHours(expires.getHours() + 24);
  }
  return expires;
}

/**
 * Formats time remaining for a poll using server_time when provided
 */
export function formatPollTimeRemaining(
  expiresAt: string,
  serverTime?: string
): { text: string; isExpired: boolean } {
  const now = serverTime ? new Date(serverTime).getTime() : Date.now();
  const expireTime = new Date(expiresAt).getTime();
  const diffMs = expireTime - now;

  if (diffMs <= 0) {
    return { text: "Poll ended", isExpired: true };
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
 * Serializes poll configuration into a post file URL (legacy fallback)
 */
export function serializePollData(poll: {
  question?: string;
  options: { id: number | string; text: string }[];
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
 * Parses poll configuration from a post's file or body (legacy fallback)
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

// =========================================================================
// OFFICIAL RPCs (poll-posts.md / Migrations 088-090)
// =========================================================================

/**
 * 1. create_post_with_poll
 * Publishes post and poll atomically with p_request_id idempotency.
 */
export async function createPostWithPoll(params: {
  body: string;
  options: string[];
  durationHours: 24 | 72 | 168;
  groupId?: string | null;
  mentions?: any[];
  requestId?: string;
}): Promise<{ data: any; error: any }> {
  const requestId = params.requestId || crypto.randomUUID();

  // Normalize options: trim and filter nonblank
  const normalizedOptions = params.options
    .map((opt) => opt.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  const { data, error } = await supabase.rpc("create_post_with_poll", {
    p_body: params.body,
    p_options: normalizedOptions,
    p_duration_hours: params.durationHours,
    p_request_id: requestId,
    p_group_id: params.groupId || null,
    p_mentions: params.mentions || [],
  });

  return { data, error };
}

/**
 * 2. get_post_polls
 * Batch-hydrates poll metadata for given post IDs (at most 50 IDs per call).
 */
export async function getPostPolls(postIds: string[]): Promise<PollView[]> {
  if (!postIds || postIds.length === 0) return [];

  // Filter and stringify IDs
  const validIds = Array.from(new Set(postIds.map(String).filter(Boolean)));
  if (validIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < validIds.length; i += 50) {
    chunks.push(validIds.slice(i, i + 50));
  }

  const results: PollView[] = [];
  for (const chunk of chunks) {
    try {
      const { data, error } = await supabase.rpc("get_post_polls", {
        p_post_ids: chunk,
      });

      if (!error && Array.isArray(data)) {
        results.push(...(data as PollView[]));
      } else if (error) {
        console.warn("[getPostPolls] RPC error:", error.message);
      }
    } catch (err) {
      console.warn("[getPostPolls] exception:", err);
    }
  }

  return results;
}

/**
 * 3. vote_post_poll
 * Casts a single and final vote via the official RPC.
 */
export async function votePostPoll(
  postId: string,
  optionId: string
): Promise<{ success: boolean; data?: PollView; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("vote_post_poll", {
      p_post_id: String(postId),
      p_option_id: String(optionId),
    });

    if (error) {
      console.warn("[votePostPoll] RPC error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as PollView };
  } catch (err: any) {
    console.error("[votePostPoll] exception:", err);
    return { success: false, error: err?.message || "Failed to submit vote." };
  }
}

// =========================================================================
// FALLBACK VOTE & STATE FUNCTIONS (For backward compatibility)
// =========================================================================

export async function getPollVoteState(
  postId: string,
  poll: PollData,
  currentUserId?: string | null
): Promise<PollData> {
  const isExpired = new Date(poll.expiresAt || poll.ends_at || "").getTime() <= Date.now();
  let userVotedOptionId: any = null;
  const votesMap: Record<string, number> = {};
  poll.options.forEach((opt: any) => {
    votesMap[String(opt.id)] = 0;
  });

  const userVoteRecorded = new Set<string>();

  try {
    const { data: dbVotes, error: dbVoteErr } = await supabase
      .from("poll_votes")
      .select("user_id, option_id")
      .eq("post_id", postId);

    if (!dbVoteErr && dbVotes) {
      dbVotes.forEach((v: any) => {
        if (!userVoteRecorded.has(v.user_id)) {
          userVoteRecorded.add(v.user_id);
          const optKey = String(v.option_id);
          votesMap[optKey] = (votesMap[optKey] || 0) + 1;
          if (currentUserId && v.user_id === currentUserId) {
            userVotedOptionId = optKey;
          }
        }
      });
    }
  } catch {}

  // Also query comments for resilient fallback on legacy posts
  try {
    const { data: commentVotes, error: commentErr } = await supabase
      .from("comments")
      .select("userId, body, created_at")
      .eq("postId", postId)
      .order("created_at", { ascending: true });

    if (!commentErr && commentVotes) {
      commentVotes.forEach((c: any) => {
        if (c.body && c.body.startsWith("[POLL_VOTE:")) {
          const match = c.body.match(/\[POLL_VOTE:(.+?)\]/);
          if (match && match[1]) {
            const optKey = String(match[1]);
            if (!userVoteRecorded.has(c.userId)) {
              userVoteRecorded.add(c.userId);
              votesMap[optKey] = (votesMap[optKey] || 0) + 1;
              if (currentUserId && c.userId === currentUserId) {
                userVotedOptionId = optKey;
              }
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn("Error reading fallback comment votes:", err);
  }

  const totalVotes = Object.values(votesMap).reduce((acc, count) => acc + count, 0);

  const updatedOptions = poll.options.map((opt: any) => {
    const optKey = String(opt.id);
    const count = votesMap[optKey] || 0;
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

export async function voteOnPoll(
  postId: string,
  optionId: number | string,
  poll: PollData
): Promise<{ success: boolean; error?: string; updatedPoll?: PollData }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { success: false, error: "Please sign in to vote." };
  }

  const userId = userData.user.id;

  if (new Date(poll.expiresAt || poll.ends_at || "").getTime() <= Date.now()) {
    return { success: false, error: "This poll has expired and is no longer accepting votes." };
  }

  // Record vote in poll_votes if table exists
  try {
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
  }

  const finalState = await getPollVoteState(postId, poll, userId);
  if (!finalState.userVotedOptionId) {
    finalState.userVotedOptionId = optionId;
    finalState.totalVotes = (finalState.totalVotes || 0) + 1;
    finalState.options = finalState.options.map((o: any) => {
      const isMatch = String(o.id) === String(optionId);
      const prev = o.votesCount ?? 0;
      const count = prev + (isMatch ? 1 : 0);
      return {
        ...o,
        votesCount: count,
        percentage: finalState.totalVotes! > 0 ? Math.round((count / finalState.totalVotes!) * 100) : 0,
      };
    });
  }
  return { success: true, updatedPoll: finalState };
}
