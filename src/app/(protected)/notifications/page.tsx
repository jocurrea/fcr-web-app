"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Undo2,
  CheckSquare,
  Square,
  X,
  RotateCcw,
  Check,
  Settings,
  Bell,
  MoreVertical,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";
import { joinFrequency } from "@/lib/api/frequencies";
import { cn } from "@/lib/utils";

interface PendingDeletion {
  ids: (string | number)[];
  items: Notification[];
  timeoutId: NodeJS.Timeout;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedInvite, setSelectedInvite] = useState<Notification | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Tabs state: Active vs Archived
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Selection Mode State (isEditing)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Overflow Dropdown Menu State
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);

  // E02-HU01: Undo Deletion State
  const [undoBanner, setUndoBanner] = useState<{
    visible: boolean;
    count: number;
    timeLeft: number;
  } | null>(null);

  const pendingDeletionRef = useRef<PendingDeletion | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const {
    notifications,
    setNotifications,
    unreadCount,
    errorMsg,
    markAsRead,
    markAllAsRead,
  } = useNotifications(userId);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pendingDeletionRef.current) {
        clearTimeout(pendingDeletionRef.current.timeoutId);
        // If unmounting with pending deletion, finalize silently
        const ids = pendingDeletionRef.current.ids;
        supabase.rpc("finalize_notifications_deletion", { notification_ids: ids }).then();
      }
      if (undoIntervalRef.current) {
        clearInterval(undoIntervalRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // E02-HU01: Deletion Logic with 5-Second Undo Window (AC 1, 2, 3)
  // -------------------------------------------------------------

  // Finalize deletion helper (invoked after 5s without undo)
  const finalizeDeletion = useCallback(async (idsToDelete: (string | number)[]) => {
    try {
      let res = await supabase.rpc("finalize_notifications_deletion", {
        notification_ids: idsToDelete,
      });

      if (res.error) {
        const res2 = await supabase.rpc("finalize_notifications_deletion", {
          p_notification_ids: idsToDelete,
        });
        if (res2.error) {
          await supabase.rpc("finalize_notifications_deletion", {
            ids: idsToDelete,
          });
        }
      }
    } catch (err) {
      console.warn("Background finalize_notifications_deletion error:", err);
    }
  }, []);

  // Delete notifications (Schedule via RPC + Start 5s timer)
  const handleDeleteNotifications = async (idsToDelete: (string | number)[]) => {
    if (idsToDelete.length === 0) return;

    // If there's an existing pending deletion, finalize it first
    if (pendingDeletionRef.current) {
      clearTimeout(pendingDeletionRef.current.timeoutId);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      finalizeDeletion(pendingDeletionRef.current.ids);
      pendingDeletionRef.current = null;
    }

    // Save items to restore in case of undo
    const itemsToSave = notifications.filter((n) => idsToDelete.includes(n.id));

    // Optimistically remove from local state
    setNotifications((prev) => prev.filter((n) => !idsToDelete.includes(n.id)));
    setSelectedIds([]);
    setIsSelectionMode(false);

    // Call schedule_notifications_deletion RPC
    try {
      let res = await supabase.rpc("schedule_notifications_deletion", {
        notification_ids: idsToDelete,
      });

      if (res.error) {
        const res2 = await supabase.rpc("schedule_notifications_deletion", {
          p_notification_ids: idsToDelete,
        });
        if (res2.error) {
          await supabase.rpc("schedule_notifications_deletion", {
            ids: idsToDelete,
          });
        }
      }
    } catch (err) {
      console.warn("schedule_notifications_deletion RPC warning:", err);
    }

    // Start 5-second countdown banner
    setUndoBanner({
      visible: true,
      count: idsToDelete.length,
      timeLeft: 5,
    });

    let secondsRemaining = 5;
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    undoIntervalRef.current = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) {
        if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      } else {
        setUndoBanner((prev) => (prev ? { ...prev, timeLeft: secondsRemaining } : null));
      }
    }, 1000);

    // Schedule 5-second timeout for finalization
    const timeoutId = setTimeout(() => {
      setUndoBanner(null);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      finalizeDeletion(idsToDelete);
      pendingDeletionRef.current = null;
    }, 5000);

    pendingDeletionRef.current = {
      ids: idsToDelete,
      items: itemsToSave,
      timeoutId,
    };
  };

  // Undo deletion (Restore via RPC + Local State)
  const handleUndoDeletion = async () => {
    if (!pendingDeletionRef.current) return;

    const { ids, items, timeoutId } = pendingDeletionRef.current;
    clearTimeout(timeoutId);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    pendingDeletionRef.current = null;
    setUndoBanner(null);

    // Optimistically restore to local state
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const restored = items.filter((n) => !existingIds.has(n.id));
      return [...restored, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // Call undo_notifications_deletion RPC
    try {
      let res = await supabase.rpc("undo_notifications_deletion", {
        notification_ids: ids,
      });

      if (res.error) {
        const res2 = await supabase.rpc("undo_notifications_deletion", {
          p_notification_ids: ids,
        });
        if (res2.error) {
          await supabase.rpc("undo_notifications_deletion", {
            ids: ids,
          });
        }
      }

      showToast(
        ids.length === 1
          ? "Notification restored."
          : `${ids.length} notifications restored.`
      );
    } catch (err) {
      console.warn("undo_notifications_deletion RPC warning:", err);
    }
  };

  // Filter Active vs Archived Notifications (E02-HU02)
  const activeNotifications = notifications.filter((n: any) => {
    const isArchived = Boolean(n.archived_at || n.archivedAt);
    const isDeleted = Boolean(n.deleted_at || n.deletedAt);
    return !isArchived && !isDeleted;
  });

  const archivedNotifications = notifications.filter((n: any) => {
    const isArchived = Boolean(n.archived_at || n.archivedAt);
    const isDeleted = Boolean(n.deleted_at || n.deletedAt);
    return isArchived && !isDeleted;
  });

  const displayedNotifications = activeTab === "active" ? activeNotifications : archivedNotifications;

  // -------------------------------------------------------------
  // E02-HU02: Archive / Unarchive Handler
  // -------------------------------------------------------------
  const handleToggleArchiveNotification = async (notificationId: string | number, shouldArchive: boolean) => {
    const timestamp = shouldArchive ? new Date().toISOString() : null;

    // Optimistic local state update
    setNotifications((prev) =>
      prev.map((n) =>
        String(n.id) === String(notificationId)
          ? { ...n, archived_at: timestamp, archivedAt: timestamp }
          : n
      )
    );

    showToast(shouldArchive ? "Notification archived." : "Notification moved to active.");

    try {
      let res = await supabase.rpc("set_notifications_archived", {
        notification_ids: [notificationId],
        is_archived: shouldArchive,
      });

      if (res.error) {
        const res2 = await supabase.rpc("set_notifications_archived", {
          p_notification_ids: [notificationId],
          p_is_archived: shouldArchive,
        });
        if (res2.error) {
          await supabase
            .from("notifications")
            .update({ archived_at: timestamp, archivedAt: timestamp })
            .eq("id", notificationId);
        }
      }
    } catch (err) {
      console.warn("set_notifications_archived RPC error, falling back to direct update:", err);
      try {
        await supabase
          .from("notifications")
          .update({ archived_at: timestamp, archivedAt: timestamp })
          .eq("id", notificationId);
      } catch (e) {}
    }
  };

  // -------------------------------------------------------------
  // Selection Handlers
  // -------------------------------------------------------------
  const toggleSelectNotification = (id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === displayedNotifications.length && displayedNotifications.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedNotifications.map((n) => n.id));
    }
  };

  const isFrequencyInvite = (notification: Notification) => {
    if (notification.type === "frequency_invite" || notification.type === "invite") return true;
    if (notification.title === "Frequency Invitation") return true;
    if (notification.data && typeof notification.data === "string") {
      if (notification.data.toLowerCase().includes("invited you to")) return true;
      if (notification.data.startsWith("{")) {
        try {
          const parsed = JSON.parse(notification.data);
          if (parsed.groupId || parsed.frequencyId) return true;
        } catch (e) {}
      }
    }
    return false;
  };

  const getFrequencyId = async (notification: Notification): Promise<string | null> => {
    if (notification.data && notification.data.startsWith("{")) {
      try {
        const parsed = JSON.parse(notification.data);
        const id = parsed.frequencyId || parsed.groupId;
        if (id) return String(id);
      } catch (e) {}
    }

    if (notification.data && notification.data.includes("Invited you to ")) {
      const groupName = notification.data.replace("Invited you to ", "").trim();
      if (groupName) {
        const { data } = await supabase
          .from("groups")
          .select("id")
          .eq("name", groupName)
          .limit(1)
          .maybeSingle();
        if (data?.id) return String(data.id);
      }
    }

    return null;
  };

  const getNotificationDestination = (notification: any): string | null => {
    // 1. Stored target url or link
    if (notification.target_url) return notification.target_url;
    if (notification.targetUrl) return notification.targetUrl;
    if (notification.url) return notification.url;
    if (notification.link) return notification.link;

    // 2. Direct IDs
    if (notification.post_id || notification.postId) {
      return `/post/${notification.post_id || notification.postId}`;
    }
    if (notification.group_id || notification.groupId || notification.frequency_id || notification.frequencyId) {
      return `/frequencies/${notification.group_id || notification.groupId || notification.frequency_id || notification.frequencyId}`;
    }

    // 3. Parsed from notification.data JSON
    if (notification.data && typeof notification.data === "string" && notification.data.startsWith("{")) {
      try {
        const parsed = JSON.parse(notification.data);
        if (parsed.target_url || parsed.targetUrl || parsed.url || parsed.link) {
          return parsed.target_url || parsed.targetUrl || parsed.url || parsed.link;
        }
        if (parsed.postId || parsed.post_id) {
          return `/post/${parsed.postId || parsed.post_id}`;
        }
        if (parsed.frequencyId || parsed.frequency_id || parsed.groupId || parsed.group_id) {
          return `/frequencies/${parsed.frequencyId || parsed.frequency_id || parsed.groupId || parsed.group_id}`;
        }
        if (parsed.userId || parsed.user_id || parsed.profileId) {
          return `/profile/${parsed.userId || parsed.user_id || parsed.profileId}`;
        }
      } catch (e) {}
    }

    // 4. By Type logic
    const notifType = (notification.type || "").toLowerCase();
    if (notifType.includes("like") || notifType.includes("comment") || notifType.includes("post")) {
      const senderId = notification.senderId || notification.sender?.id;
      return senderId ? `/profile/${senderId}` : "/home";
    }

    if (notifType.includes("invite") || notifType.includes("frequency")) {
      return null; // Will trigger the invite modal via isFrequencyInvite
    }

    if (notifType.includes("visit") || notifType.includes("follow") || notifType.includes("profile")) {
      const senderId = notification.senderId || notification.sender?.id;
      return senderId ? `/profile/${senderId}` : null;
    }

    if (notifType.includes("affiliation") || notifType.includes("business")) {
      return "/business/requests";
    }

    // Fallback to sender profile
    const senderId = notification.senderId || notification.sender?.id;
    if (senderId) return `/profile/${senderId}`;

    return null;
  };

  const handleNotificationClick = (e: React.MouseEvent, notification: Notification) => {
    if (isSelectionMode) {
      e.preventDefault();
      toggleSelectNotification(notification.id);
      return;
    }

    if (notification.read === 0) {
      markAsRead(notification.id);
    }

    if (isFrequencyInvite(notification)) {
      e.preventDefault();
      setSelectedInvite(notification);
      return;
    }

    const destination = getNotificationDestination(notification);
    if (destination) {
      router.push(destination);
    }
  };

  const handleJoinFrequency = async () => {
    if (!selectedInvite) return;

    setIsJoining(true);
    const frequencyId = await getFrequencyId(selectedInvite);

    if (!frequencyId) {
      setIsJoining(false);
      showToast("Could not find frequency ID for this invitation.", "error");
      return;
    }

    const res = await joinFrequency(frequencyId);
    setIsJoining(false);

    if (res.success) {
      setSelectedInvite(null);
      router.push(`/frequencies/${frequencyId}`);
    } else {
      showToast(res.error || "Failed to join frequency.", "error");
    }
  };

  const handleViewFrequency = async () => {
    if (!selectedInvite) return;
    const frequencyId = await getFrequencyId(selectedInvite);
    setSelectedInvite(null);
    if (frequencyId) {
      router.push(`/frequencies/${frequencyId}`);
    } else {
      router.push("/frequencies");
    }
  };

  const formatSenderName = (sender?: any) => {
    if (!sender) return "Someone";
    const fn = sender.firstName && sender.firstName !== "null" ? sender.firstName : "";
    const ln = sender.lastName && sender.lastName !== "null" ? sender.lastName : "";
    const fullName = [fn, ln].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if (sender.companyName && sender.companyName !== "null") return sender.companyName;
    if (sender.username && sender.username !== "null") return sender.username;
    if (sender.name && sender.name !== "null") return sender.name;
    return "Someone";
  };

  const formatNotificationDate = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dateFormatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) {
      return `${dateFormatted} • just now`;
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${dateFormatted} • ${diffInMinutes}m`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${dateFormatted} • ${diffInHours}h`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${dateFormatted} • ${diffInDays}d`;
    }
    return dateFormatted;
  };

  const getNotificationText = (notification: Notification) => {
    if (notification.data && notification.data.startsWith("{")) {
      try {
        const parsed = JSON.parse(notification.data);
        if (parsed.message) return parsed.message;
        if (parsed.groupId || parsed.frequencyId)
          return notification.title || "Invited you to a frequency";
        if (parsed.profileUserId)
          return notification.title || (notification.type === "like" ? "liked your profile" : "viewed your profile");
        if (parsed.commentId) return notification.title || "commented on your post";
        if (parsed.postId) return notification.title || "liked your post";
      } catch (e) {}
    }

    if (notification.data && notification.data.trim().startsWith("{")) {
      return notification.title || (notification.type === "visit" ? "viewed your profile" : "New notification");
    }

    return notification.data || notification.title || (notification.type === "visit" ? "viewed your profile" : "New notification");
  };

  const getNotificationLink = (notification: Notification) => {
    if (isSelectionMode) return "#";

    let postId = null;
    let frequencyId = null;
    let profileUserId = null;

    try {
      if (notification.data && notification.data.startsWith("{")) {
        const parsed = JSON.parse(notification.data);
        if (parsed.postId) postId = parsed.postId;
        if (parsed.frequencyId || parsed.groupId) frequencyId = parsed.frequencyId || parsed.groupId;
        if (parsed.profileUserId) profileUserId = parsed.profileUserId;
      }
    } catch (e) {}

    if (postId) {
      return `/post/${postId}`;
    }
    if (frequencyId) {
      return `/frequencies/${frequencyId}`;
    }
    if (profileUserId || notification.type === "visit" || notification.type === "like") {
      return `/profile/${profileUserId || notification.senderId}`;
    }
    if (isFrequencyInvite(notification)) {
      return `/frequencies`;
    }
    return "#";
  };

  return (
    <div className="flex justify-center w-full bg-white min-h-screen">
      <div className="w-full max-w-2xl bg-white min-h-screen border-x border-gray-100 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                } else {
                  router.back();
                }
              }}
              className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
              title={isSelectionMode ? "Cancel selection" : "Back"}
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isSelectionMode ? `${selectedIds.length} selected` : "Notifications"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {!isSelectionMode ? (
              <>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Read all
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsSelectionMode(true)}
                    className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                )}

                <Link
                  href="/notifications/preferences"
                  className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Notification Preferences"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Tabs: Active / Archived with Rounded Corners */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-white">
          <div className="bg-gray-100/80 p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-xl transition-all text-center cursor-pointer",
                activeTab === "active"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("archived");
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }
              }}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-xl transition-all text-center cursor-pointer",
                activeTab === "archived"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Control Bar in Edit Mode */}
        {isSelectionMode && activeTab === "active" && (
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 bg-gray-50/70 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              {selectedIds.length === notifications.length && notifications.length > 0
                ? "Deselect all"
                : "Select all"}
            </button>

            <button
              type="button"
              onClick={() => handleDeleteNotifications(selectedIds)}
              disabled={selectedIds.length === 0}
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Delete selected notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-4">
              <h3 className="font-bold">Error fetching notifications:</h3>
              <pre className="text-sm mt-2 whitespace-pre-wrap">{errorMsg}</pre>
            </div>
          )}

          {activeTab === "archived" ? (
            archivedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                  <Bell className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No archived notifications</p>
              </div>
            ) : (
              archivedNotifications.map((notification) => {
                const isSelected = selectedIds.includes(notification.id);

                return (
                  <div
                    key={notification.id}
                    onClick={(e) => handleNotificationClick(e, notification)}
                    className={cn(
                      "p-4 rounded-2xl flex items-center gap-3.5 transition-all border shadow-2xs group cursor-pointer hover:bg-slate-50 relative",
                      notification.read === 0
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-gray-100 bg-white",
                      isSelected && "ring-2 ring-blue-500 border-transparent bg-blue-50/30"
                    )}
                  >
                    {/* Selection Mode Checkbox */}
                    {isSelectionMode && (
                      <div className="shrink-0">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-gray-300 bg-white hover:border-blue-400"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {notification.sender?.profileImage ? (
                        <img
                          src={notification.sender.profileImage}
                          className="w-11 h-11 rounded-full object-cover bg-gray-100 border border-gray-200 shadow-2xs"
                          alt=""
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#1d4ed8] text-white font-extrabold flex items-center justify-center text-base shadow-2xs">
                          {formatSenderName(notification.sender)[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="text-sm text-gray-900 font-extrabold truncate">
                          {formatSenderName(notification.sender)}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap font-medium">
                          {formatNotificationDate(notification.created_at || (notification as any).lastActivityAt)}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate leading-relaxed">
                        {getNotificationText(notification)}
                      </span>
                    </div>

                    {/* Contextual Dropdown Menu (3-Dots) */}
                    {!isSelectionMode && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === notification.id ? null : notification.id));
                          }}
                          className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors shrink-0 cursor-pointer opacity-70 group-hover:opacity-100"
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === notification.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleToggleArchiveNotification(notification.id, false);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5 text-blue-600" />
                              <span>Unarchive</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDeleteNotifications([notification.id]);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : activeNotifications.length === 0 && !errorMsg ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-500 gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                <CheckCircle2 className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No notifications yet.</p>
            </div>
          ) : (
            activeNotifications.map((notification) => {
              const isSelected = selectedIds.includes(notification.id);

              return (
                <div
                  key={notification.id}
                  onClick={(e) => handleNotificationClick(e, notification)}
                  className={cn(
                    "p-4 rounded-2xl flex items-center gap-3.5 transition-all border shadow-2xs group cursor-pointer hover:bg-slate-50 relative",
                    notification.read === 0
                      ? "border-emerald-200 bg-emerald-50/20"
                      : "border-gray-100 bg-white",
                    isSelected && "ring-2 ring-blue-500 border-transparent bg-blue-50/30"
                  )}
                >
                  {/* Selection Mode Checkbox */}
                  {isSelectionMode && (
                    <div className="shrink-0">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300 bg-white hover:border-blue-400"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {notification.sender?.profileImage ? (
                      <img
                        src={notification.sender.profileImage}
                        className="w-11 h-11 rounded-full object-cover bg-gray-100 border border-gray-200 shadow-2xs"
                        alt=""
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#1d4ed8] text-white font-extrabold flex items-center justify-center text-base shadow-2xs">
                        {formatSenderName(notification.sender)[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-start w-full gap-2">
                      <span className="text-sm text-gray-900 font-extrabold truncate">
                        {formatSenderName(notification.sender)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap font-medium">
                        {formatNotificationDate(notification.created_at || (notification as any).lastActivityAt)}
                      </span>
                    </div>

                    <span className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate leading-relaxed">
                      {getNotificationText(notification)}
                    </span>
                  </div>

                  {/* Contextual Dropdown Menu (3-Dots) */}
                  {!isSelectionMode && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === notification.id ? null : notification.id));
                        }}
                        className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors shrink-0 cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === notification.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleToggleArchiveNotification(notification.id, true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5 text-blue-600" />
                            <span>Archive</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDeleteNotifications([notification.id]);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* -------------------------------------------------------------
            E02-HU01: 5-Second Floating Undo Banner (AC 3)
            ------------------------------------------------------------- */}
        {undoBanner?.visible && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-full animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className="relative overflow-hidden bg-gray-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-gray-800 flex items-center justify-between gap-3">
              {/* Progress bar animation */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all ease-linear"
                style={{
                  width: `${(undoBanner.timeLeft / 5) * 100}%`,
                  transitionDuration: "1000ms",
                }}
              />

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs sm:text-sm font-bold truncate">
                    {undoBanner.count === 1
                      ? "Notification deleted"
                      : `${undoBanner.count} notifications deleted`}
                  </p>
                  <span className="text-[11px] text-gray-400">
                    Undo available for {undoBanner.timeLeft}s
                  </span>
                </div>
              </div>

              {/* Undo Action Button */}
              <button
                type="button"
                onClick={handleUndoDeletion}
                className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {selectedInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-[24px] p-6 shadow-2xl flex flex-col gap-4 mx-auto"
            style={{ maxWidth: "420px", width: "100%" }}
          >
            {/* Sender info header */}
            <div className="flex items-center gap-3.5">
              <div className="flex-shrink-0">
                {selectedInvite.sender?.profileImage ? (
                  <img
                    src={selectedInvite.sender.profileImage}
                    className="w-12 h-12 rounded-full object-cover bg-gray-100"
                    alt=""
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {formatSenderName(selectedInvite.sender)[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-base font-bold text-gray-900 truncate leading-snug">
                  {formatSenderName(selectedInvite.sender)}
                </h3>
                <p className="text-sm text-gray-600 truncate leading-snug">
                  {getNotificationText(selectedInvite)}
                </p>
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={handleJoinFrequency}
                disabled={isJoining}
                className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-full hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 min-w-[70px]"
              >
                {isJoining ? "..." : "Join"}
              </button>
              <button
                onClick={handleViewFrequency}
                className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-full hover:bg-blue-700 transition-colors shadow-sm min-w-[70px]"
              >
                View
              </button>
              <button
                onClick={() => setSelectedInvite(null)}
                className="px-5 py-2 bg-white border border-blue-600 text-blue-600 font-semibold text-sm rounded-full hover:bg-blue-50 transition-colors min-w-[70px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div
            className={`px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
              toastMessage.type === "success"
                ? "bg-gray-900 text-white border-gray-800"
                : "bg-red-600 text-white border-red-500"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
            )}
            <span className="text-sm font-semibold whitespace-nowrap">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
