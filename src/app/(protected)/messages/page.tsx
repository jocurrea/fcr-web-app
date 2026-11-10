"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  Check,
  X,
  Clock,
  Send,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Ban,
  Flag,
  ShieldAlert,
} from "lucide-react";
import {
  fetchUserInbox,
  respondToMessageRequest,
  blockUser,
  reportSpamUser,
  ConversationSummary,
} from "@/lib/api/chat";
import { MessageReceipt } from "@/components/chat/message-receipt";
import { cn } from "@/lib/utils";

export default function MessagesInboxPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversations, setActiveConversations] = useState<ConversationSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConversationSummary[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConversationSummary[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // HU-02: Anti-Spam Controls Modal upon 2nd decline
  const [antiSpamModal, setAntiSpamModal] = useState<{ targetUserId: string; targetUserName: string } | null>(null);
  const [antiSpamStatus, setAntiSpamStatus] = useState<{ blocked?: boolean; reported?: boolean }>({});

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadInbox = async () => {
    try {
      setLoading(true);
      const data = await fetchUserInbox();
      setActiveConversations(data.activeConversations);
      setIncomingRequests(data.incomingRequests);
      setOutgoingRequests(data.outgoingRequests);
    } catch (err) {
      console.error("Failed to load inbox:", err);
      showToast("Failed to load messages", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleAcceptRequest = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActionInProgress(conversationId);
    try {
      const res = await respondToMessageRequest(conversationId, "accepted");
      if (res.success) {
        showToast("Message request accepted! Opening chat...", "success");
        await loadInbox();
        router.push(`/messages/${conversationId}`);
      } else {
        showToast(res.error || "Failed to accept request", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to accept request", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeclineRequest = async (e: React.MouseEvent, req: ConversationSummary) => {
    e.stopPropagation();
    e.preventDefault();
    setActionInProgress(req.id);
    try {
      const res = await respondToMessageRequest(req.id, "declined");
      if (res.success) {
        if (res.declinedCount && res.declinedCount >= 2) {
          showToast(`Declined (2nd time). Anti-spam actions activated.`, "success");
          setAntiSpamModal({
            targetUserId: req.otherUser.id,
            targetUserName: req.otherUser.name,
          });
          setAntiSpamStatus({});
        } else {
          showToast("Message request declined (72-hour cooldown).", "success");
        }
        await loadInbox();
      } else {
        showToast(res.error || "Failed to decline request", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to decline request", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBlockFromModal = async () => {
    if (!antiSpamModal) return;
    try {
      const res = await blockUser(antiSpamModal.targetUserId);
      if (res.success) {
        setAntiSpamStatus((prev) => ({ ...prev, blocked: true }));
        showToast(`${antiSpamModal.targetUserName} has been blocked.`, "success");
      } else {
        showToast(res.error || "Failed to block user.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to block user.", "error");
    }
  };

  const handleReportFromModal = async () => {
    if (!antiSpamModal) return;
    try {
      const res = await reportSpamUser(antiSpamModal.targetUserId, "spam");
      if (res.success) {
        setAntiSpamStatus((prev) => ({ ...prev, reported: true }));
        showToast("Spam report submitted. Our team will review this user.", "success");
      } else {
        showToast(res.error || "Failed to submit report.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to submit report.", "error");
    }
  };

  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const filteredActive = activeConversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.otherUser.name.toLowerCase().includes(query) ||
      (c.otherUser.role && c.otherUser.role.toLowerCase().includes(query)) ||
      (c.lastMessage?.body && c.lastMessage.body.toLowerCase().includes(query))
    );
  });

  const pendingRequestsCount = incomingRequests.length;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-16">
      {/* Toast Notification */}
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

      {/* Main Container */}
      <div className="max-w-lg mx-auto bg-white min-h-screen border-x border-gray-100 flex flex-col shadow-xs">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/blockedUsers"
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition"
                title="Blocked Users"
              >
                <Ban className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-full transition"
                title="Search people to message"
              >
                <Search className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats or members..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Segmented Control / Tabs */}
          <div className="bg-gray-100/90 p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("messages")}
              className={cn(
                "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all text-center cursor-pointer",
                activeTab === "messages"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              Messages
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={cn(
                "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5",
                activeTab === "requests"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              <span>Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-extrabold bg-blue-600 text-white rounded-full leading-none">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-gray-500 font-medium">Loading conversations...</p>
            </div>
          ) : activeTab === "messages" ? (
            /* ========================================================
               TAB 1: Active Messages List
               ======================================================== */
            filteredActive.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredActive.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/messages/${conv.id}`}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50/80 transition-colors group cursor-pointer"
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                          src={conv.otherUser.avatar}
                          alt={conv.otherUser.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              conv.otherUser.name
                            )}`;
                          }}
                        />
                      </div>
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-gray-900 text-sm truncate">
                            {conv.otherUser.name}
                          </span>
                          {conv.otherUser.role && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-md shrink-0 capitalize">
                              {conv.otherUser.role.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0 font-medium">
                          {formatTimestamp(conv.lastMessage?.created_at || conv.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate leading-relaxed">
                        {conv.lastMessage && conv.lastMessage.sender_id !== conv.otherUser.id && (
                          <MessageReceipt status="delivered" />
                        )}
                        <span className="truncate">
                          {conv.lastMessage?.body || "Start a conversation..."}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">No active conversations</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-5 leading-relaxed">
                  Connect with pilots, cabin crew, or companies across FlightCrew to start direct messaging.
                </p>
                <Link
                  href="/search"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Find People to Message
                </Link>
              </div>
            )
          ) : (
            /* ========================================================
               TAB 2: Message Requests (Incoming & Outgoing)
               ======================================================== */
            <div className="flex-1 flex flex-col p-4 space-y-6">
              {/* Notice Banner */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold">Message Requests</span> keep your direct messaging safe.
                  First-contact messages are restricted to 1 text-only message until you accept.
                </div>
              </div>

              {/* Incoming Requests Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Incoming Requests ({incomingRequests.length})
                  </h2>
                </div>

                {incomingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => router.push(`/messages/${req.id}`)}
                        className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 shadow-2xs transition cursor-pointer flex flex-col gap-3 group"
                      >
                        {/* Header: Sender Info */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                              <img
                                src={req.otherUser.avatar}
                                alt={req.otherUser.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                    req.otherUser.name
                                  )}`;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 truncate">
                                {req.otherUser.name}
                              </h3>
                              <p className="text-[11px] text-gray-500 capitalize">
                                {req.otherUser.role?.replace(/_/g, " ") || "Member"}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] text-gray-400 shrink-0 font-medium">
                            {formatTimestamp(req.created_at)}
                          </span>
                        </div>

                        {/* First message preview */}
                        {req.lastMessage?.body && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed italic">
                            "{req.lastMessage.body}"
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={actionInProgress === req.id}
                            onClick={(e) => handleAcceptRequest(e, req.id)}
                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionInProgress === req.id}
                            onClick={(e) => handleDeclineRequest(e, req)}
                            className="py-2 px-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 active:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50/80 rounded-2xl border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">No pending incoming requests.</p>
                  </div>
                )}
              </div>

              {/* Outgoing Requests Section */}
              {outgoingRequests.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Sent Requests Waiting for Acceptance ({outgoingRequests.length})
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => router.push(`/messages/${req.id}`)}
                        className="p-3.5 bg-white border border-gray-200/90 rounded-2xl hover:border-gray-300 transition cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                            <img
                              src={req.otherUser.avatar}
                              alt={req.otherUser.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  req.otherUser.name
                                )}`;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {req.otherUser.name}
                            </h4>
                            <p className="text-[11px] text-gray-500 truncate">
                              {req.lastMessage?.body || "First contact message"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-semibold">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HU-02: Anti-Spam Controls Modal (Surfaced upon 2nd decline) */}
      {antiSpamModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">
                    Anti-Spam Controls
                  </h3>
                  <p className="text-[11px] text-gray-500">2nd decline registered</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAntiSpamModal(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You have declined <span className="font-bold text-gray-900">{antiSpamModal.targetUserName}</span> twice. They are now permanently blocked from sending you message requests. Would you also like to take further protective action?
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleBlockFromModal}
                disabled={antiSpamStatus.blocked}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{antiSpamStatus.blocked ? "User Blocked" : "Block User"}</span>
              </button>

              <button
                type="button"
                onClick={handleReportFromModal}
                disabled={antiSpamStatus.reported}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{antiSpamStatus.reported ? "Report Submitted" : "Report Spam"}</span>
              </button>

              <button
                type="button"
                onClick={() => setAntiSpamModal(null)}
                className="w-full py-2 text-center text-gray-400 hover:text-gray-600 text-xs font-semibold transition mt-1 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

