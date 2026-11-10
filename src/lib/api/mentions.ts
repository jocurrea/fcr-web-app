import { supabase } from "@/lib/supabase";
import { fetchFrequencyById, fetchFrequencyMembers, FrequencyMember } from "@/lib/api/frequencies";

export interface MentionMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role?: string;
  groupRole?: "admin" | "member";
}

/**
 * Normalizes username handles for mentions
 */
export function formatUsernameHandle(user: { name?: string; username?: string; firstName?: string; lastName?: string }): string {
  if (user.username && user.username !== "user") {
    return user.username.replace(/^@/, "").replace(/\s+/g, "_").toLowerCase();
  }
  const cleanName = (user.name || `${user.firstName || ""} ${user.lastName || ""}`).trim();
  if (cleanName) {
    return cleanName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  }
  return "member";
}

/**
 * HU-04: Autocomplete Restrictions
 * Inside a Private Frequency, returns strictly validated active members of that specific Frequency.
 */
export async function fetchFrequencyMentionableMembers(
  frequencyId: string
): Promise<{ isPrivate: boolean; members: MentionMember[] }> {
  if (!frequencyId) return { isPrivate: false, members: [] };

  try {
    const freq = await fetchFrequencyById(frequencyId);
    const isPrivate =
      (freq?.isPublic as any) === 0 ||
      freq?.isPublic === false ||
      (freq as any)?.is_public === 0 ||
      (freq as any)?.is_public === false;

    const rawMembers = await fetchFrequencyMembers(frequencyId);

    const members: MentionMember[] = rawMembers.map((m) => {
      const handle = formatUsernameHandle({
        name: m.name,
        username: (m as any).username,
      });

      return {
        id: m.id,
        name: m.name,
        username: handle,
        avatar: m.avatar,
        role: m.role,
        groupRole: m.groupRole,
      };
    });

    return { isPrivate, members };
  } catch (err) {
    console.error("Error fetching frequency mentionable members:", err);
    return { isPrivate: false, members: [] };
  }
}

/**
 * Filters members based on search query after '@'
 */
export function filterMentionSuggestions(
  members: MentionMember[],
  query: string
): MentionMember[] {
  if (!query) return members.slice(0, 8);
  const q = query.toLowerCase().replace(/^@/, "");
  return members
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
    )
    .slice(0, 8);
}

/**
 * HU-04: External Mention Disabling
 * Checks handles in text against validated active members if in a Private Frequency.
 * Returns valid member handles map: handle -> userId.
 * Handles not in this map MUST render as plain text.
 */
export async function resolveFrequencyMemberMentions(
  frequencyId: string,
  text: string
): Promise<{ isPrivate: boolean; validMembersMap: Map<string, string> }> {
  const validMembersMap = new Map<string, string>();
  if (!frequencyId || !text) return { isPrivate: false, validMembersMap };

  try {
    const { isPrivate, members } = await fetchFrequencyMentionableMembers(frequencyId);
    if (!isPrivate) {
      // In public frequency or global, all handles can be resolved
      members.forEach((m) => {
        validMembersMap.set(m.username.toLowerCase(), m.id);
        // Also map clean name
        const clean = m.name.replace(/\s+/g, "_").toLowerCase();
        validMembersMap.set(clean, m.id);
      });
      return { isPrivate: false, validMembersMap };
    }

    // In a PRIVATE Frequency: ONLY active validated members are valid!
    members.forEach((m) => {
      validMembersMap.set(m.username.toLowerCase(), m.id);
      const clean = m.name.replace(/\s+/g, "_").toLowerCase();
      validMembersMap.set(clean, m.id);
    });

    return { isPrivate: true, validMembersMap };
  } catch (err) {
    console.error("Error resolving frequency mentions:", err);
    return { isPrivate: false, validMembersMap };
  }
}

/**
 * HU-04: Notification Privacy
 * Mention notifications are triggered ONLY for validated group members of a private frequency.
 * External users typed manually do NOT receive any notification.
 */
export async function dispatchMentionNotifications({
  text,
  postId,
  frequencyId,
  commentId,
}: {
  text: string;
  postId: string;
  frequencyId?: string | null;
  commentId?: string;
}): Promise<void> {
  if (!text || !postId) return;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    if (!currentUserId) return;

    // 1. Extract all @mentions from text
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const matches = Array.from(text.matchAll(mentionRegex)).map((m) => m[1].toLowerCase());
    if (matches.length === 0) return;

    const uniqueHandles = Array.from(new Set(matches));

    // Get current sender user name
    const { data: senderUser } = await supabase
      .from("users")
      .select("firstName, lastName, username")
      .eq("id", currentUserId)
      .maybeSingle();

    const senderName = senderUser
      ? [senderUser.firstName, senderUser.lastName].filter(Boolean).join(" ").trim() ||
        senderUser.username ||
        "Someone"
      : "Someone";

    // 2. If in a Frequency, check if Private
    if (frequencyId) {
      const { isPrivate, members } = await fetchFrequencyMentionableMembers(frequencyId);

      const freq = await fetchFrequencyById(frequencyId);
      const frequencyName = freq?.name || "a private frequency";

      if (isPrivate) {
        // HU-04 Privacy Rule: Mention notifications triggered ONLY for validated group members!
        const memberHandleMap = new Map<string, string>();
        members.forEach((m) => {
          memberHandleMap.set(m.username.toLowerCase(), m.id);
          memberHandleMap.set(m.name.replace(/\s+/g, "_").toLowerCase(), m.id);
        });

        for (const handle of uniqueHandles) {
          const recipientId = memberHandleMap.get(handle);
          // If handle does not belong to a validated member, DO NOT NOTIFY!
          if (!recipientId || recipientId === currentUserId) continue;

          await supabase.from("notifications").insert({
            senderId: currentUserId,
            receiverId: recipientId,
            title: "New Mention",
            data: JSON.stringify({
              message: `${senderName} mentioned you in ${frequencyName}.`,
              postId,
              frequencyId,
              commentId,
            }),
            type: "mention",
            read: 0,
          });
        }
        return;
      }
    }

    // 3. Global / Public Post mentions:
    // Look up users by username or name in users table
    for (const handle of uniqueHandles) {
      const { data: matchedUsers } = await supabase
        .from("users")
        .select("id")
        .or(`username.ilike.${handle},firstName.ilike.${handle}`)
        .limit(1);

      if (matchedUsers && matchedUsers.length > 0) {
        const recipientId = matchedUsers[0].id;
        if (recipientId === currentUserId) continue;

        await supabase.from("notifications").insert({
          senderId: currentUserId,
          receiverId: recipientId,
          title: "New Mention",
          data: JSON.stringify({
            message: `${senderName} mentioned you in a post.`,
            postId,
            frequencyId,
            commentId,
          }),
          type: "mention",
          read: 0,
        });
      }
    }
  } catch (err) {
    console.error("Error dispatching mention notifications:", err);
  }
}

