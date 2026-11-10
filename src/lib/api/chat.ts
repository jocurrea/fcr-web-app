import { supabase } from "@/lib/supabase";

export interface ChatParticipant {
  conversation_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar: string;
    role?: string;
  };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface ChatRequest {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at?: string | null;
  sender?: {
    id: string;
    name: string;
    avatar: string;
    role?: string;
  };
  initial_message?: string;
}

export interface ConversationSummary {
  id: string;
  type: string;
  created_at: string;
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    role?: string;
  };
  lastMessage?: ChatMessage | null;
  requestStatus?: "pending" | "accepted" | "declined" | null;
  isSenderOfRequest?: boolean;
  requestId?: string;
}

/**
 * Fetch user helper to enrich sender / participant data
 */
async function fetchUserPreview(userId: string) {
  try {
    const [{ data: u }, { data: r }, { data: c }] = await Promise.all([
      supabase.from("users").select("id, firstName, lastName, username, profileImage, position, accountType, companyName").eq("id", userId).maybeSingle(),
      supabase.from("resumes").select("data").eq("userId", userId).maybeSingle(),
      supabase.from("companies").select("name, logo_url").eq("owner_user_id", userId).maybeSingle(),
    ]);

    const resumeData = (r?.data as any) || {};
    const personal = resumeData.personal || {};
    const fn = u?.firstName || personal.firstName || "";
    const ln = u?.lastName || personal.lastName || "";
    const fullName = [fn, ln].filter(Boolean).join(" ").trim();
    const displayName = c?.name || u?.companyName || fullName || u?.username || "FlightCrew User";
    const avatar = c?.logo_url || u?.profileImage || personal.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || userId)}`;
    const role = c?.name ? "Company" : (u?.position || personal.position || u?.accountType || "Member");

    return {
      id: userId,
      name: displayName,
      avatar,
      role,
    };
  } catch (e) {
    return {
      id: userId,
      name: "User",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}`,
      role: "Member",
    };
  }
}

export interface ContactStatus {
  canSend: boolean;
  reason?: "cooldown" | "permanently_declined" | "blocked" | "blocked_by_me" | "business_dms_disabled" | "pending_exists" | "active_exists";
  declinedCount: number;
  cooldownUntil?: string | null;
  remainingHours?: number;
  remainingMinutes?: number;
  existingConversationId?: string | null;
  activeRequestId?: string | null;
  businessName?: string;
}

/**
 * HU-02 & HU-05: Check sender contact status, enforcing:
 * 1. 72-hour cooldown upon 1st decline
 * 2. Permanent block upon 2nd decline
 * 3. Unidirectional dynamics (Sender -> Recipient)
 * 4. Existing blocks in blocked_users table (blocked by recipient OR blocked by me)
 * 5. Business Messaging Toggle: Disabling "Allow Direct Messages" on Business accounts
 */
export async function checkSenderContactStatus(recipientId: string): Promise<ContactStatus> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId || !recipientId) {
    return { canSend: false, declinedCount: 0 };
  }

  try {
    // 1. Check if recipient has explicitly blocked current user or current user blocked recipient
    const [{ data: blockedByRecipient }, { data: blockedByMe }] = await Promise.all([
      supabase
        .from("blocked_users")
        .select("id")
        .eq("blockerId", recipientId)
        .eq("blockedId", currentUserId)
        .maybeSingle(),
      supabase
        .from("blocked_users")
        .select("id")
        .eq("blockerId", currentUserId)
        .eq("blockedId", recipientId)
        .maybeSingle(),
    ]);

    if (blockedByRecipient) {
      return { canSend: false, reason: "blocked", declinedCount: 2 };
    }

    if (blockedByMe) {
      return { canSend: false, reason: "blocked_by_me", declinedCount: 0 };
    }

    // 2. HU-05: Check if recipient is a Business Account with "Allow Direct Messages" disabled
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name")
      .eq("owner_user_id", recipientId)
      .maybeSingle();

    if (companyData) {
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("allow_crew_direct_messages")
        .eq("company_id", companyData.id)
        .maybeSingle();

      if (companySettings && companySettings.allow_crew_direct_messages === false) {
        return {
          canSend: false,
          reason: "business_dms_disabled",
          declinedCount: 0,
          businessName: companyData.name || "This company",
        };
      }
    }

    // 3. Query requests sent by current user to recipientId (Strictly Unidirectional)
    const { data: sentRequests, error } = await supabase
      .from("chat_requests")
      .select("*")
      .eq("sender_id", currentUserId)
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error querying sent requests:", error);
    }

    const requests = sentRequests || [];

    // Check for an active pending request
    const pendingReq = requests.find((r) => r.status === "pending");
    if (pendingReq) {
      return {
        canSend: false,
        reason: "pending_exists",
        declinedCount: 0,
        activeRequestId: pendingReq.id,
        existingConversationId: pendingReq.conversation_id,
      };
    }

    // Check for an already accepted request
    const acceptedReq = requests.find((r) => r.status === "accepted");
    if (acceptedReq) {
      return {
        canSend: false,
        reason: "active_exists",
        declinedCount: 0,
        existingConversationId: acceptedReq.conversation_id,
      };
    }

    // Filter declined requests
    const declinedRequests = requests.filter((r) => r.status === "declined");
    const declinedCount = declinedRequests.length;

    // HU-02: Second Decline & Permanent Block
    if (declinedCount >= 2) {
      return {
        canSend: false,
        reason: "permanently_declined",
        declinedCount,
      };
    }

    // HU-02: First Decline & 72-Hour Cooldown
    if (declinedCount === 1) {
      const lastDeclined = declinedRequests[0];
      const respondedAt = lastDeclined.responded_at || lastDeclined.created_at;
      const declineTime = new Date(respondedAt).getTime();
      const cooldownMs = 72 * 60 * 60 * 1000; // 72 hours
      const cooldownUntilDate = new Date(declineTime + cooldownMs);
      const remainingMs = cooldownUntilDate.getTime() - Date.now();

      if (remainingMs > 0) {
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
          canSend: false,
          reason: "cooldown",
          declinedCount: 1,
          cooldownUntil: cooldownUntilDate.toISOString(),
          remainingHours,
          remainingMinutes,
          existingConversationId: lastDeclined.conversation_id,
        };
      }

      // Cooldown expired! Sender is allowed to send 2nd (and final) request
      return {
        canSend: true,
        declinedCount: 1,
        existingConversationId: lastDeclined.conversation_id,
      };
    }

    // No declines, free to send first request
    return {
      canSend: true,
      declinedCount: 0,
    };
  } catch (err) {
    console.error("Error checking contact status:", err);
    return { canSend: true, declinedCount: 0 };
  }
}

/**
 * Check if a direct conversation already exists between current user and target user
 */
export async function getExistingDirectConversation(
  targetUserId: string
): Promise<{ conversationId: string | null; requestStatus: "pending" | "accepted" | "declined" | null; isSender: boolean } | null> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId || !targetUserId) return null;

  // 1. Check existing chat_requests between current user and target user
  const { data: requests } = await supabase
    .from("chat_requests")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`
    )
    .order("created_at", { ascending: false })
    .limit(1);

  if (requests && requests.length > 0) {
    const req = requests[0];
    return {
      conversationId: req.conversation_id,
      requestStatus: req.status,
      isSender: req.sender_id === currentUserId,
    };
  }

  // 2. Fallback: check chat_participants intersection
  const { data: myParticipations } = await supabase
    .from("chat_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (myParticipations && myParticipations.length > 0) {
    const convIds = myParticipations.map((p) => p.conversation_id);
    const { data: targetParticipations } = await supabase
      .from("chat_participants")
      .select("conversation_id")
      .eq("user_id", targetUserId)
      .in("conversation_id", convIds)
      .limit(1);

    if (targetParticipations && targetParticipations.length > 0) {
      return {
        conversationId: targetParticipations[0].conversation_id,
        requestStatus: "accepted", // treated as active if participants exist without pending request
        isSender: false,
      };
    }
  }

  return null;
}

/**
 * Send First-Contact Message Request:
 * 1. Strictly text-only initial message
 * 2. Creates chat_conversations row
 * 3. Adds both users to chat_participants
 * 4. Creates pending row in chat_requests
 * 5. Inserts the 1 initial message in chat_messages
 */
export async function initiateMessageRequest(
  recipientId: string,
  textMessage: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized. Please sign in." };

  if (!recipientId) return { success: false, error: "Recipient ID is required." };
  if (!textMessage || !textMessage.trim()) return { success: false, error: "Initial message cannot be empty." };

  const cleanBody = textMessage.trim();

  // HU-02: Check Cooldown, Maximum Declines, and Blocks
  const contactStatus = await checkSenderContactStatus(recipientId);
  if (!contactStatus.canSend) {
    if (contactStatus.reason === "cooldown") {
      return {
        success: false,
        error: `A 72-hour cooldown is active because your previous request was declined. You can send a final request in ${contactStatus.remainingHours}h ${contactStatus.remainingMinutes}m.`,
      };
    }
    if (contactStatus.reason === "permanently_declined") {
      return {
        success: false,
        error: "This user has declined your previous requests. You cannot send further message requests.",
      };
    }
    if (contactStatus.reason === "blocked") {
      return {
        success: false,
        error: "You cannot send messages to this user.",
      };
    }
    if (contactStatus.reason === "pending_exists") {
      return {
        success: false,
        error: "You already have a pending message request with this user.",
      };
    }
  }

  try {
    let conversationId = contactStatus.existingConversationId;

    if (!conversationId) {
      // 1. Create a new conversation
      const { data: convData, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          type: "direct",
        })
        .select("id")
        .single();

      if (convError || !convData) {
        console.error("Error creating chat conversation:", convError);
        return { success: false, error: convError?.message || "Failed to create conversation" };
      }

      conversationId = convData.id;

      // 2. Add both participants
      const participants = [
        { conversation_id: conversationId, user_id: currentUserId },
        { conversation_id: conversationId, user_id: recipientId },
      ];
      const { error: partError } = await supabase
        .from("chat_participants")
        .insert(participants);

      if (partError) {
        console.error("Error adding chat participants:", partError);
      }
    }

    // 3. Create/re-open Message Request in chat_requests (status: pending)
    const { error: reqError } = await supabase
      .from("chat_requests")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        recipient_id: recipientId,
        status: "pending",
      });

    if (reqError) {
      console.error("Error creating chat_request record:", reqError);
    }

    // 4. Insert the first text-only message into chat_messages
    const { error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: cleanBody,
      });

    if (msgError) {
      console.error("Error inserting initial chat message:", msgError);
    }

    return { success: true, conversationId: conversationId || undefined };
  } catch (err: any) {
    console.error("Exception in initiateMessageRequest:", err);
    return { success: false, error: err?.message || "Failed to initiate message request" };
  }
}

/**
 * Accept or Decline an incoming Message Request
 * HU-02: Returns declinedCount to trigger Anti-Spam Controls on 2nd decline
 */
export async function respondToMessageRequest(
  conversationId: string,
  decision: "accepted" | "declined"
): Promise<{ success: boolean; declinedCount?: number; senderId?: string; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  try {
    // 1. Fetch current request to get sender_id
    const { data: currentReq } = await supabase
      .from("chat_requests")
      .select("sender_id")
      .eq("conversation_id", conversationId)
      .eq("recipient_id", currentUserId)
      .maybeSingle();

    const senderId = currentReq?.sender_id;

    // 2. Update status and responded_at
    const { error } = await supabase
      .from("chat_requests")
      .update({
        status: decision,
        responded_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", currentUserId);

    if (error) {
      console.error(`Error responding (${decision}) to chat request:`, error);
      return { success: false, error: error.message };
    }

    let declinedCount = 1;
    if (decision === "declined" && senderId) {
      const { data: allDeclined } = await supabase
        .from("chat_requests")
        .select("id")
        .eq("sender_id", senderId)
        .eq("recipient_id", currentUserId)
        .eq("status", "declined");

      declinedCount = (allDeclined || []).length || 1;
    }

    return { success: true, declinedCount, senderId: senderId || undefined };
  } catch (err: any) {
    console.error("Exception responding to message request:", err);
    return { success: false, error: err?.message || "Failed to update request" };
  }
}

/**
 * HU-02: Block a user (inserts into blocked_users)
 */
export async function blockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("blocked_users")
      .insert({
        blockerId: currentUserId,
        blockedId: targetUserId,
      });

    if (error && !error.message.includes("unique")) {
      console.error("Error blocking user:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to block user" };
  }
}

/**
 * HU-02: Report a user for spam / unwanted solicitation (inserts into reports)
 */
export async function reportSpamUser(
  targetUserId: string,
  reason: string = "spam"
): Promise<{ success: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("reports")
      .insert({
        reporterId: currentUserId,
        targetId: targetUserId,
        targetType: "user",
        reason: reason,
        status: "pending",
      });

    if (error) {
      console.error("Error submitting spam report:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit report" };
  }
}

/**
 * HU-02 & HU-05: Unblock a user
 * - Deletes from blocked_users
 * - Restores past message history in read-only archive mode
 */
export async function unblockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blockerId", currentUserId)
      .eq("blockedId", targetUserId);

    if (error) return { success: false, error: error.message };

    // HU-05: Record that past conversation is restored in read-only archive mode
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`fcr_unblocked_archive_${currentUserId}_${targetUserId}`, "true");
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to unblock user" };
  }
}

/**
 * HU-05: Initiate a new Message Request from an unblocked read-only archive
 * Follows standard rules: 1 text-only message, lands in recipient's Requests tab
 */
export async function initiateNewMessageRequestFromArchive(
  conversationId: string,
  targetUserId: string,
  initialMessage: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  if (!initialMessage.trim()) {
    return { success: false, error: "Message cannot be empty." };
  }

  try {
    // 1. Remove archive flag
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(`fcr_unblocked_archive_${currentUserId}_${targetUserId}`);
      }
    } catch {}

    // 2. Insert or update request row with pending status
    const { data: existingReq } = await supabase
      .from("chat_requests")
      .select("id")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (existingReq) {
      await supabase
        .from("chat_requests")
        .update({
          sender_id: currentUserId,
          recipient_id: targetUserId,
          status: "pending",
          initial_message: initialMessage.trim(),
          created_at: new Date().toISOString(),
          responded_at: null,
        })
        .eq("id", existingReq.id);
    } else {
      await supabase.from("chat_requests").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        recipient_id: targetUserId,
        status: "pending",
        initial_message: initialMessage.trim(),
      });
    }

    // 3. Insert initial text message into chat_messages
    const { data: newMsg, error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: initialMessage.trim(),
      })
      .select("*")
      .single();

    if (msgError) {
      console.error("Error inserting message from archive request:", msgError);
    }

    return { success: true, data: newMsg };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send message request" };
  }
}

/**
 * Fetch list of blocked users for the current user
 */
export async function fetchBlockedUsers(): Promise<{ id: string; name: string; avatar: string; role?: string; blockedAt?: string }[]> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return [];

  try {
    const { data: records, error } = await supabase
      .from("blocked_users")
      .select("blockedId, created_at")
      .eq("blockerId", currentUserId);

    if (error || !records) return [];

    const list = await Promise.all(
      records.map(async (r) => {
        const u = await fetchUserPreview(r.blockedId);
        return {
          ...u,
          blockedAt: r.created_at,
        };
      })
    );

    return list;
  } catch {
    return [];
  }
}

/**
 * Send a message in an active conversation
 * (Only allowed if request is accepted or active)
 */
export async function sendChatMessage(
  conversationId: string,
  body: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  if (!body.trim()) return { success: false, error: "Message cannot be empty" };

  try {
    // 1. Fetch participants to identify other user
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    const otherParticipant = (participants || []).find((p) => p.user_id !== currentUserId);
    const otherUserId = otherParticipant?.user_id;

    if (otherUserId) {
      // 2. HU-05: Check if either party blocked the other
      const [{ data: b1 }, { data: b2 }] = await Promise.all([
        supabase
          .from("blocked_users")
          .select("id")
          .eq("blockerId", currentUserId)
          .eq("blockedId", otherUserId)
          .maybeSingle(),
        supabase
          .from("blocked_users")
          .select("id")
          .eq("blockerId", otherUserId)
          .eq("blockedId", currentUserId)
          .maybeSingle(),
      ]);

      if (b1) {
        return { success: false, error: "You have blocked this contact. Unblock them to send messages." };
      }
      if (b2) {
        return { success: false, error: "Cannot send message. You have been blocked by this user." };
      }

      // 3. HU-05: Check if other user is a Business Account with direct messages disabled
      const { data: otherCompany } = await supabase
        .from("companies")
        .select("id, name")
        .eq("owner_user_id", otherUserId)
        .maybeSingle();

      if (otherCompany) {
        const { data: companySettings } = await supabase
          .from("company_settings")
          .select("allow_crew_direct_messages")
          .eq("company_id", otherCompany.id)
          .maybeSingle();

        if (companySettings && companySettings.allow_crew_direct_messages === false) {
          return {
            success: false,
            error: "Direct messaging has been disabled by this business account.",
          };
        }
      }

      // 4. HU-05: Check if sender themselves is a Business Account with direct messages disabled
      const { data: myCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_user_id", currentUserId)
        .maybeSingle();

      if (myCompany) {
        const { data: mySettings } = await supabase
          .from("company_settings")
          .select("allow_crew_direct_messages")
          .eq("company_id", myCompany.id)
          .maybeSingle();

        if (mySettings && mySettings.allow_crew_direct_messages === false) {
          return {
            success: false,
            error: "Direct messaging is disabled on your company profile. Re-enable it in settings to send messages.",
          };
        }
      }
    }

    // Check if there is a pending request for this conversation
    const { data: pendingReq } = await supabase
      .from("chat_requests")
      .select("status, sender_id, recipient_id")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (pendingReq && pendingReq.status === "pending") {
      return {
        success: false,
        error: "Message request has not been accepted yet. Sending additional messages is restricted until accepted.",
      };
    }

    if (pendingReq && pendingReq.status === "declined") {
      return {
        success: false,
        error: "This message request was declined.",
      };
    }

    // Insert message
    const { data: newMsg, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: body.trim(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error inserting chat message:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: newMsg };
  } catch (err: any) {
    console.error("Exception in sendChatMessage:", err);
    return { success: false, error: err?.message || "Failed to send message" };
  }
}

/**
 * Fetch all conversations for the user:
 * Split into:
 * 1. accepted / active chats (Messages Tab)
 * 2. incoming pending requests (Requests Tab)
 * 3. outgoing pending requests
 */
export async function fetchUserInbox(): Promise<{
  activeConversations: ConversationSummary[];
  incomingRequests: ConversationSummary[];
  outgoingRequests: ConversationSummary[];
}> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) {
    return { activeConversations: [], incomingRequests: [], outgoingRequests: [] };
  }

  try {
    // 1. Get all conversations current user participates in
    const { data: myParticipations, error: pError } = await supabase
      .from("chat_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    if (pError || !myParticipations || myParticipations.length === 0) {
      return { activeConversations: [], incomingRequests: [], outgoingRequests: [] };
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);

    // 2. Fetch all other participants in these conversations
    const { data: allParticipants } = await supabase
      .from("chat_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds)
      .neq("user_id", currentUserId);

    const otherUserByConv = new Map<string, string>();
    (allParticipants || []).forEach((p) => {
      otherUserByConv.set(p.conversation_id, p.user_id);
    });

    // 3. Fetch requests status for these conversations
    const { data: requestsData } = await supabase
      .from("chat_requests")
      .select("*")
      .in("conversation_id", conversationIds);

    const requestsMap = new Map<string, any>();
    (requestsData || []).forEach((r) => {
      requestsMap.set(r.conversation_id, r);
    });

    // 4. Fetch the latest messages for each conversation
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const lastMessageMap = new Map<string, any>();
    (messagesData || []).forEach((m) => {
      if (!lastMessageMap.has(m.conversation_id)) {
        lastMessageMap.set(m.conversation_id, m);
      }
    });

    // 5. Fetch profile previews for all other users in parallel
    const otherUserIds = Array.from(new Set(Array.from(otherUserByConv.values())));
    const userPreviews = await Promise.all(otherUserIds.map((uid) => fetchUserPreview(uid)));
    const userPreviewMap = new Map(userPreviews.map((u) => [u.id, u]));

    // 6. HU-05: Query all blocked relations involving current user
    const [{ data: blockedByMe }, { data: blockedMe }] = await Promise.all([
      supabase.from("blocked_users").select("blockedId").eq("blockerId", currentUserId),
      supabase.from("blocked_users").select("blockerId").eq("blockedId", currentUserId),
    ]);

    const blockedUserIds = new Set<string>();
    (blockedByMe || []).forEach((b) => b.blockedId && blockedUserIds.add(b.blockedId));
    (blockedMe || []).forEach((b) => b.blockerId && blockedUserIds.add(b.blockerId));

    const activeList: ConversationSummary[] = [];
    const incomingList: ConversationSummary[] = [];
    const outgoingList: ConversationSummary[] = [];

    for (const convId of conversationIds) {
      const otherUserId = otherUserByConv.get(convId);
      if (!otherUserId) continue;

      // HU-05: Blocking immediately halts contact and hides the chat thread from active inbox views
      if (blockedUserIds.has(otherUserId)) {
        continue;
      }

      const otherUser = userPreviewMap.get(otherUserId) || {
        id: otherUserId,
        name: "User",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherUserId)}`,
        role: "Member",
      };

      const req = requestsMap.get(convId);
      const lastMsg = lastMessageMap.get(convId) || null;

      const summary: ConversationSummary = {
        id: convId,
        type: "direct",
        created_at: req?.created_at || lastMsg?.created_at || new Date().toISOString(),
        otherUser,
        lastMessage: lastMsg,
        requestStatus: req?.status || "accepted",
        isSenderOfRequest: req ? req.sender_id === currentUserId : false,
        requestId: req?.id,
      };

      if (!req || req.status === "accepted") {
        activeList.push(summary);
      } else if (req.status === "pending") {
        if (req.recipient_id === currentUserId) {
          incomingList.push(summary);
        } else {
          outgoingList.push(summary);
        }
      }
    }

    // Sort by latest message / date
    const sortByDate = (a: ConversationSummary, b: ConversationSummary) => {
      const dateA = new Date(a.lastMessage?.created_at || a.created_at).getTime();
      const dateB = new Date(b.lastMessage?.created_at || b.created_at).getTime();
      return dateB - dateA;
    };

    return {
      activeConversations: activeList.sort(sortByDate),
      incomingRequests: incomingList.sort(sortByDate),
      outgoingRequests: outgoingList.sort(sortByDate),
    };
  } catch (err) {
    console.error("Error fetching user inbox:", err);
    return { activeConversations: [], incomingRequests: [], outgoingRequests: [] };
  }
}

export interface ConversationDetailsResponse {
  conversation: any;
  messages: ChatMessage[];
  request: ChatRequest | null;
  otherUser: { id: string; name: string; avatar: string; role?: string } | null;
  currentUserId: string;
  isBlockedByMe: boolean;
  isBlockedByOther: boolean;
  isReadOnlyArchive: boolean;
  isBusinessDMsDisabled: boolean;
  businessNotice?: string;
}

/**
 * Fetch messages and status for a specific conversation
 */
export async function fetchConversationDetails(
  conversationId: string
): Promise<ConversationDetailsResponse | null> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId || !conversationId) return null;

  try {
    // 1. Fetch participants
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    const otherParticipant = (participants || []).find((p) => p.user_id !== currentUserId);
    const otherUser = otherParticipant ? await fetchUserPreview(otherParticipant.user_id) : null;

    // 2. Fetch request state
    const { data: requestRow } = await supabase
      .from("chat_requests")
      .select("*")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    // 3. Fetch messages
    const { data: msgs, error: msgError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) {
      console.error("Error fetching messages:", msgError);
    }

    // 4. HU-05: Check Block Statuses
    let isBlockedByMe = false;
    let isBlockedByOther = false;
    let isReadOnlyArchive = false;
    let isBusinessDMsDisabled = false;
    let businessNotice: string | undefined;

    if (otherParticipant) {
      const [{ data: myBlock }, { data: otherBlock }] = await Promise.all([
        supabase
          .from("blocked_users")
          .select("id")
          .eq("blockerId", currentUserId)
          .eq("blockedId", otherParticipant.user_id)
          .maybeSingle(),
        supabase
          .from("blocked_users")
          .select("id")
          .eq("blockerId", otherParticipant.user_id)
          .eq("blockedId", currentUserId)
          .maybeSingle(),
      ]);

      isBlockedByMe = !!myBlock;
      isBlockedByOther = !!otherBlock;

      // Check if unblocked archive mode is active
      if (!isBlockedByMe && !isBlockedByOther) {
        try {
          if (typeof window !== "undefined") {
            const hasArchiveFlag = localStorage.getItem(`fcr_unblocked_archive_${currentUserId}_${otherParticipant.user_id}`) === "true";
            if (hasArchiveFlag && requestRow?.status !== "accepted") {
              isReadOnlyArchive = true;
            }
          }
        } catch {}
      }

      // Check Business Messaging Toggle on recipient
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name")
        .eq("owner_user_id", otherParticipant.user_id)
        .maybeSingle();

      if (companyData) {
        const { data: companySettings } = await supabase
          .from("company_settings")
          .select("allow_crew_direct_messages")
          .eq("company_id", companyData.id)
          .maybeSingle();

        if (companySettings && companySettings.allow_crew_direct_messages === false) {
          isBusinessDMsDisabled = true;
          businessNotice = `${companyData.name || "This business account"} does not accept direct messages at this time.`;
        }
      }

      // Check Business Messaging Toggle on sender (current user)
      const { data: myCompany } = await supabase
        .from("companies")
        .select("id, name")
        .eq("owner_user_id", currentUserId)
        .maybeSingle();

      if (myCompany) {
        const { data: mySettings } = await supabase
          .from("company_settings")
          .select("allow_crew_direct_messages")
          .eq("company_id", myCompany.id)
          .maybeSingle();

        if (mySettings && mySettings.allow_crew_direct_messages === false) {
          isBusinessDMsDisabled = true;
          businessNotice = "Direct messaging is currently disabled on your business account.";
        }
      }
    }

    return {
      conversation: { id: conversationId },
      messages: (msgs as ChatMessage[]) || [],
      request: (requestRow as ChatRequest) || null,
      otherUser,
      currentUserId,
      isBlockedByMe,
      isBlockedByOther,
      isReadOnlyArchive,
      isBusinessDMsDisabled,
      businessNotice,
    };
  } catch (err) {
    console.error("Error in fetchConversationDetails:", err);
    return null;
  }
}

