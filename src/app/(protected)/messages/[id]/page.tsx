"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Check,
  X,
  Clock,
  ShieldAlert,
  ShieldCheck,
  User,
  Info,
  Lock,
  Ban,
  Flag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchConversationDetails,
  sendChatMessage,
  respondToMessageRequest,
  blockUser,
  unblockUser,
  reportSpamUser,
  initiateNewMessageRequestFromArchive,
  ChatMessage,
  ChatRequest,
} from "@/lib/api/chat";
import { MessageReceipt, MessageDeliveryStatus } from "@/components/chat/message-receipt";
import { cn } from "@/lib/utils";

export default function ConversationThreadPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [request, setRequest] = useState<ChatRequest | null>(null);
  const [otherUser, setOtherUser] = useState<{
    id: string;
    name: string;
    avatar: string;
    role?: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // HU-02: Anti-Spam Controls on decline
  const [declinedCount, setDeclinedCount] = useState<number>(1);
  const [hasBlocked, setHasBlocked] = useState<boolean>(false);
  const [hasReported, setHasReported] = useState<boolean>(false);

  // HU-05: User Blocking, WhatsApp Style Inbox Action Banner & Business Messaging Toggle
  const [isBlockedByMe, setIsBlockedByMe] = useState<boolean>(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState<boolean>(false);
  const [isReadOnlyArchive, setIsReadOnlyArchive] = useState<boolean>(false);
  const [isBusinessDMsDisabled, setIsBusinessDMsDisabled] = useState<boolean>(false);
  const [businessNotice, setBusinessNotice] = useState<string | null>(null);
  const [showNewRequestInput, setShowNewRequestInput] = useState<boolean>(false);
  const [newRequestMessage, setNewRequestMessage] = useState<string>("");
  const [sendingNewRequest, setSendingNewRequest] = useState<boolean>(false);

  // HU-03: Real-time Universal Delivery and Read Receipts
  const [receiptsMap, setReceiptsMap] = useState<Record<string, MessageDeliveryStatus>>({});
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load cached receipts from localStorage
  useEffect(() => {
    if (!conversationId) return;
    try {
      const savedRead = localStorage.getItem(`fcr_chat_read_${conversationId}`);
      if (savedRead) setLastReadTimestamp(savedRead);
      const savedReceipts = localStorage.getItem(`fcr_chat_receipts_${conversationId}`);
      if (savedReceipts) setReceiptsMap(JSON.parse(savedReceipts));
    } catch {}
  }, [conversationId]);

  const updateReceipt = (messageId: string, status: MessageDeliveryStatus) => {
    setReceiptsMap((prev) => {
      const next = { ...prev, [messageId]: status };
      try {
        localStorage.setItem(`fcr_chat_receipts_${conversationId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const getMessageReceiptStatus = (msg: ChatMessage): MessageDeliveryStatus => {
    // 1. Explicitly recorded receipt status
    if (receiptsMap[msg.id]) return receiptsMap[msg.id];

    // 2. If other user sent a message at or after this message was created, it's definitely read (Seen)
    const otherRepliedLater = messages.some(
      (m) =>
        m.sender_id !== currentUserId &&
        new Date(m.created_at).getTime() >= new Date(msg.created_at).getTime()
    );
    if (otherRepliedLater) return "read";

    // 3. If recipient has triggered a read broadcast at or after this message was sent
    if (
      lastReadTimestamp &&
      new Date(msg.created_at).getTime() <= new Date(lastReadTimestamp).getTime()
    ) {
      return "read";
    }

    // 4. If message is older than 2 seconds, it was delivered to active client
    const ageMs = Date.now() - new Date(msg.created_at).getTime();
    if (ageMs > 2000) return "delivered";

    // 5. Default: Single Gray Check (stored in backend)
    return "sent";
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversation = async () => {
    if (!conversationId) return;
    try {
      const details = await fetchConversationDetails(conversationId);
      if (!details) {
        showToast("Conversation not found", "error");
        return;
      }
      setMessages(details.messages);
      setRequest(details.request);
      setOtherUser(details.otherUser);
      setCurrentUserId(details.currentUserId);
      setIsBlockedByMe(details.isBlockedByMe);
      setIsBlockedByOther(details.isBlockedByOther);
      setIsReadOnlyArchive(details.isReadOnlyArchive);
      setIsBusinessDMsDisabled(details.isBusinessDMsDisabled);
      setBusinessNotice(details.businessNotice || null);
    } catch (err) {
      console.error("Error loading conversation:", err);
      showToast("Failed to load conversation", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up Supabase Realtime listeners with Broadcast and Presence for HU-03
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat_${conversationId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId || "anon" },
      },
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // HU-03: If incoming message from other user, broadcast delivered and read
          if (newMsg.sender_id !== currentUserId) {
            channel.send({
              type: "broadcast",
              event: "message_delivered",
              payload: {
                conversationId,
                messageId: newMsg.id,
                recipientId: currentUserId,
              },
            });

            const now = new Date().toISOString();
            setLastReadTimestamp(now);
            try {
              localStorage.setItem(`fcr_chat_read_${conversationId}`, now);
            } catch {}

            channel.send({
              type: "broadcast",
              event: "message_read",
              payload: {
                conversationId,
                readerId: currentUserId,
                timestamp: now,
              },
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_requests",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedReq = payload.new as ChatRequest;
          setRequest(updatedReq);
        }
      )
      .on("broadcast", { event: "message_delivered" }, ({ payload }) => {
        if (payload?.messageId) {
          updateReceipt(payload.messageId, "delivered");
        }
      })
      .on("broadcast", { event: "message_read" }, ({ payload }) => {
        if (payload?.timestamp) {
          setLastReadTimestamp(payload.timestamp);
          try {
            localStorage.setItem(`fcr_chat_read_${conversationId}`, payload.timestamp);
          } catch {}
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const otherPresent = Object.values(state).flat().some((p: any) => p.userId === otherUser?.id);
        if (otherPresent) {
          const now = new Date().toISOString();
          setLastReadTimestamp(now);
          try {
            localStorage.setItem(`fcr_chat_read_${conversationId}`, now);
          } catch {}
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentUserId) {
          try {
            await channel.track({ userId: currentUserId, inChat: true });
          } catch {}

          // Notify other party that this conversation was opened and read
          const now = new Date().toISOString();
          channel.send({
            type: "broadcast",
            event: "message_read",
            payload: {
              conversationId,
              readerId: currentUserId,
              timestamp: now,
            },
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, otherUser?.id]);

  // Status computation based on HU-01 specifications
  const isPending = request?.status === "pending";
  const isDeclined = request?.status === "declined";
  const isAccepted = !request || request.status === "accepted";

  const isCurrentUserRecipient = request ? request.recipient_id === currentUserId : false;
  const isCurrentUserSender = request ? request.sender_id === currentUserId : false;

  // Actions
  const handleAccept = async () => {
    if (!conversationId) return;
    setActionInProgress(true);
    try {
      const res = await respondToMessageRequest(conversationId, "accepted");
      if (res.success) {
        showToast("Request accepted! You can now chat freely.", "success");
        setRequest((prev) => (prev ? { ...prev, status: "accepted" } : null));
      } else {
        showToast(res.error || "Failed to accept request", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to accept request", "error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDecline = async () => {
    if (!conversationId) return;
    setActionInProgress(true);
    try {
      const res = await respondToMessageRequest(conversationId, "declined");
      if (res.success) {
        if (res.declinedCount && res.declinedCount >= 2) {
          setDeclinedCount(res.declinedCount);
          showToast("Request declined (2nd time). Sender is permanently blocked from messaging.", "success");
        } else {
          showToast("Request declined. Sender is under 72-hour cooldown.", "success");
        }
        setRequest((prev) => (prev ? { ...prev, status: "declined" } : null));
      } else {
        showToast(res.error || "Failed to decline request", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to decline request", "error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBlockUser = async () => {
    if (!otherUser?.id) return;
    try {
      const res = await blockUser(otherUser.id);
      if (res.success) {
        setHasBlocked(true);
        setIsBlockedByMe(true);
        showToast(`${otherUser.name} has been blocked.`, "success");
      } else {
        showToast(res.error || "Failed to block user.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to block user.", "error");
    }
  };

  const handleUnblockUser = async () => {
    if (!otherUser?.id) return;
    setActionInProgress(true);
    try {
      const res = await unblockUser(otherUser.id);
      if (res.success) {
        setIsBlockedByMe(false);
        setIsReadOnlyArchive(true);
        showToast(`${otherUser.name} has been unblocked. Past messages restored in read-only mode.`, "success");
      } else {
        showToast(res.error || "Failed to unblock user.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to unblock user.", "error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSendNewRequestFromArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestMessage.trim() || !otherUser?.id || sendingNewRequest) return;

    setSendingNewRequest(true);
    try {
      const res = await initiateNewMessageRequestFromArchive(
        conversationId,
        otherUser.id,
        newRequestMessage.trim()
      );
      if (res.success) {
        showToast("New message request sent! Waiting for response.", "success");
        setIsReadOnlyArchive(false);
        setShowNewRequestInput(false);
        setNewRequestMessage("");
        if (res.data) {
          setMessages((prev) => [...prev, res.data]);
        }
        await loadConversation();
      } else {
        showToast(res.error || "Failed to send message request", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to send message request", "error");
    } finally {
      setSendingNewRequest(false);
    }
  };

  const handleReportSpam = async () => {
    if (!otherUser?.id) return;
    try {
      const res = await reportSpamUser(otherUser.id, "spam");
      if (res.success) {
        setHasReported(true);
        showToast("Spam report submitted. Our team will review this user.", "success");
      } else {
        showToast(res.error || "Failed to submit report.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to submit report.", "error");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    if (isPending) {
      showToast("Cannot send additional messages while request is pending.", "error");
      return;
    }

    if (isDeclined) {
      showToast("This message request was declined.", "error");
      return;
    }

    setSending(true);
    setInputText("");

    try {
      const res = await sendChatMessage(conversationId, text);
      if (res.success && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      } else {
        showToast(res.error || "Failed to send message", "error");
        setInputText(text); // restore input
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send message", "error");
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all duration-300 animate-in fade-in slide-in-from-top-4",
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          )}
        >
          {toastMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <X className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Column */}
      <div className="max-w-lg mx-auto w-full bg-white flex-1 border-x border-gray-100 flex flex-col shadow-xs min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/messages"
              className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition shrink-0"
              title="Back to inbox"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {otherUser && (
              <Link
                href={`/profile/${otherUser.id}`}
                className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
                title="View profile"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        otherUser.name
                      )}`;
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition truncate leading-snug">
                    {otherUser.name}
                  </h2>
                  {otherUser.role && (
                    <p className="text-[11px] text-gray-500 capitalize leading-none truncate">
                      {otherUser.role.replace(/_/g, " ")}
                    </p>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* Status Badge & Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isBlockedByMe ? (
              <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-bold tracking-tight shrink-0 flex items-center gap-1">
                <Ban className="w-3 h-3" />
                <span>Blocked</span>
              </span>
            ) : isBlockedByOther ? (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-[10px] font-bold tracking-tight shrink-0">
                Restricted
              </span>
            ) : isBusinessDMsDisabled ? (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold tracking-tight shrink-0 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>DMs Disabled</span>
              </span>
            ) : isReadOnlyArchive ? (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold tracking-tight shrink-0">
                Read-Only Archive
              </span>
            ) : isPending ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold tracking-tight shrink-0">
                Request Pending
              </span>
            ) : isDeclined ? (
              <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-bold tracking-tight shrink-0">
                Declined
              </span>
            ) : null}

            {/* Quick Block action if not blocked and not in pending/declined */}
            {otherUser && !isBlockedByMe && !isBlockedByOther && (
              <button
                type="button"
                onClick={handleBlockUser}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 flex items-center justify-center transition cursor-pointer"
                title="Block User"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col justify-end min-h-[300px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Info className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-500 max-w-xs">
                No messages yet. Send a message to start communicating.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed break-words [overflow-wrap:anywhere]",
                        isMe
                          ? "bg-blue-600 text-white rounded-br-xs shadow-2xs"
                          : "bg-gray-100 text-gray-900 rounded-bl-xs"
                      )}
                    >
                      {msg.body}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-gray-400">
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isMe && (
                        <MessageReceipt status={getMessageReceiptStatus(msg)} />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Footer Area: WhatsApp Style Action Banner or Message Input */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 sm:p-4">
          {/* CASE A: User is blocked by current user */}
          {isBlockedByMe ? (
            <div className="bg-gray-100/90 border border-gray-200/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 text-center shadow-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                <Ban className="w-4 h-4 text-red-500" />
                <span>You blocked this contact.</span>
              </div>
              <button
                type="button"
                onClick={handleUnblockUser}
                disabled={actionInProgress}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>Unblock</span>
              </button>
            </div>
          ) : isBlockedByOther ? (
            /* CASE B: Current user was blocked by the other user */
            <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 text-center shadow-2xs animate-in fade-in">
              <p className="text-xs text-gray-600 font-semibold">
                You cannot send messages to this contact.
              </p>
            </div>
          ) : isBusinessDMsDisabled ? (
            /* CASE C: Business account disabled direct messages */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-center shadow-2xs animate-in fade-in">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-700 font-medium leading-relaxed">
                {businessNotice || "This business account is currently not accepting direct messages. This chat is in read-only mode."}
              </span>
            </div>
          ) : isReadOnlyArchive ? (
            /* CASE D: Unblocked State / Read-Only Archive Mode */
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>Past messages are in read-only archive mode.</span>
              </div>

              {showNewRequestInput ? (
                <form onSubmit={handleSendNewRequestFromArchive} className="w-full flex flex-col gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={newRequestMessage}
                      onChange={(e) => setNewRequestMessage(e.target.value)}
                      placeholder="Write a message request (1 text-only message)..."
                      disabled={sendingNewRequest}
                      autoFocus
                      className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!newRequestMessage.trim() || sendingNewRequest}
                      className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {sendingNewRequest ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewRequestInput(false)}
                    className="text-[11px] text-gray-500 hover:text-gray-700 self-center cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewRequestInput(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message Request</span>
                </button>
              )}
            </div>
          ) : isPending && isCurrentUserRecipient ? (
            /* CASE 1: Recipient viewing an incoming pending message request */
            <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold">{otherUser?.name || "This user"}</span> has sent you a message request.
                  They are restricted to 1 text-only message and cannot send attachments until you accept.
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={actionInProgress}
                  onClick={handleAccept}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Request</span>
                </button>
                <button
                  type="button"
                  disabled={actionInProgress}
                  onClick={handleDecline}
                  className="py-2.5 px-4 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          ) : isPending && isCurrentUserSender ? (
            /* CASE 2: Sender viewing outgoing pending message request */
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 text-xs leading-relaxed shadow-2xs">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Message request pending.</span> You can send more messages and share attachments once{" "}
                <span className="font-semibold">{otherUser?.name || "the user"}</span> accepts your request.
              </div>
            </div>
          ) : isDeclined && isCurrentUserRecipient ? (
            /* CASE 3: Request was declined */
            <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900 leading-relaxed">
                  <span className="font-bold">Message request declined.</span>{" "}
                  {declinedCount >= 2
                    ? `${otherUser?.name || "This user"} was declined twice and is permanently blocked from sending you message requests.`
                    : `${otherUser?.name || "This user"} has a 72-hour cooldown before they can send a final request.`}
                </div>
              </div>

              {/* HU-02: Anti-Spam Controls surfaced upon decline */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleBlockUser}
                  disabled={hasBlocked}
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{hasBlocked ? "User Blocked" : "Block User"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReportSpam}
                  disabled={hasReported}
                  className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 disabled:opacity-60 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{hasReported ? "Reported" : "Report Spam"}</span>
                </button>
              </div>
            </div>
          ) : isDeclined && isCurrentUserSender ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center text-gray-500 text-xs gap-1 font-medium">
              <span>This message request was declined.</span>
              <span className="text-[11px] text-gray-400">
                A 72-hour cooldown is required before submitting a 2nd (and final) request.
              </span>
            </div>
          ) : isAccepted ? (
            /* CASE 4: Active Chat Input */
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
                title="Send message"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

