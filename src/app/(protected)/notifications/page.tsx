"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";
import { joinFrequency } from "@/lib/api/frequencies";

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedInvite, setSelectedInvite] = useState<Notification | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
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

  const { notifications, unreadCount, errorMsg, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications(userId);

  const isFrequencyInvite = (notification: Notification) => {
    if (notification.type === 'frequency_invite' || notification.type === 'invite') return true;
    if (notification.title === 'Frequency Invitation') return true;
    if (notification.data && typeof notification.data === 'string') {
      if (notification.data.toLowerCase().includes('invited you to')) return true;
      if (notification.data.startsWith('{')) {
        try {
          const parsed = JSON.parse(notification.data);
          if (parsed.groupId || parsed.frequencyId) return true;
        } catch (e) {}
      }
    }
    return false;
  };

  const getFrequencyId = async (notification: Notification): Promise<string | null> => {
    if (notification.data && notification.data.startsWith('{')) {
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
          .from('groups')
          .select('id')
          .eq('name', groupName)
          .limit(1)
          .maybeSingle();
        if (data?.id) return String(data.id);
      }
    }

    return null;
  };

  const handleNotificationClick = (e: React.MouseEvent, notification: Notification) => {
    if (notification.read === 0) {
      markAsRead(notification.id);
    }
    
    if (isFrequencyInvite(notification)) {
      e.preventDefault();
      setSelectedInvite(notification);
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
      router.push('/frequencies');
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

  const getNotificationText = (notification: Notification) => {
    if (notification.data && notification.data.startsWith('{')) {
      try {
        const parsed = JSON.parse(notification.data);
        if (parsed.message) return parsed.message;
        if (parsed.groupId || parsed.frequencyId) return notification.title || "Invited you to a frequency";
        if (parsed.profileUserId) return notification.title || (notification.type === 'like' ? 'liked your profile' : 'viewed your profile');
        if (parsed.commentId) return notification.title || "commented on your post";
        if (parsed.postId) return notification.title || "liked your post";
      } catch (e) {}
    }
    
    if (notification.data && notification.data.trim().startsWith('{')) {
      return notification.title || (notification.type === 'visit' ? 'viewed your profile' : 'New notification');
    }

    return notification.data || notification.title || (notification.type === 'visit' ? 'viewed your profile' : 'New notification');
  };

  const getNotificationLink = (notification: Notification) => {
    let postId = null;
    let frequencyId = null;
    let profileUserId = null;

    try {
      if (notification.data && notification.data.startsWith('{')) {
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
    if (profileUserId || notification.type === 'visit' || notification.type === 'like') {
      return `/profile/${profileUserId || notification.senderId}`;
    }
    if (isFrequencyInvite(notification)) {
      return `/frequencies`;
    }
    return "#";
  };

  return (
    <div className="flex justify-center w-full bg-white min-h-screen">
      <div className="w-full max-w-2xl bg-white min-h-screen border-x border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          
          <h1 className="text-[17px] font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">
            Notifications
          </h1>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Read all
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                onClick={() => {
                  clearAllNotifications();
                  showToast("All notifications cleared.");
                }}
                className="text-[13px] font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-4">
              <h3 className="font-bold">Error fetching notifications:</h3>
              <pre className="text-sm mt-2 whitespace-pre-wrap">{errorMsg}</pre>
            </div>
          )}
          {notifications.length === 0 && !errorMsg ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={getNotificationLink(notification)}
                onClick={(e) => handleNotificationClick(e, notification)}
                className={`p-4 rounded-[16px] flex items-start gap-4 transition-colors border-2 shadow-sm bg-white hover:bg-gray-50`}
                style={
                  notification.read === 0 
                    ? { borderColor: '#4ade80' } 
                    : { borderColor: '#e5e7eb' }
                }
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {notification.sender?.profileImage ? (
                    <img 
                      src={notification.sender.profileImage} 
                      className="w-[42px] h-[42px] rounded-full object-cover bg-gray-100" 
                      alt="" 
                    />
                  ) : (
                    <div className="w-[42px] h-[42px] rounded-full bg-gray-400 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                  <div className="flex justify-between items-start w-full gap-2">
                    <span className="text-[14px] text-gray-900 font-medium truncate">
                      {formatSenderName(notification.sender)}
                    </span>
                    <span className="text-[13px] text-gray-700 whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className="text-[13px] text-gray-600 mt-0.5 truncate pr-2">
                    {getNotificationText(notification)}
                  </span>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteNotification(notification.id);
                    showToast("Notification deleted.");
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors shrink-0 cursor-pointer self-center"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {selectedInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-white rounded-[24px] p-6 shadow-2xl flex flex-col gap-4 mx-auto"
            style={{ maxWidth: '420px', width: '100%' }}
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
                    {formatSenderName(selectedInvite.sender)[0]?.toUpperCase() || 'U'}
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
          <div className={`px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
            toastMessage.type === 'success' 
              ? 'bg-gray-900 text-white border-gray-800' 
              : 'bg-red-600 text-white border-red-500'
          }`}>
            {toastMessage.type === 'success' ? (
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
