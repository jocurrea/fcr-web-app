"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    });
  }, []);

  const { notifications, unreadCount, errorMsg, markAsRead, markAllAsRead } = useNotifications(userId);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.read === 0) {
      markAsRead(notification.id);
    }
  };

  const getNotificationLink = (notification: Notification) => {
    let postId = null;
    try {
      if (notification.data && notification.data.startsWith('{')) {
        const parsed = JSON.parse(notification.data);
        if (parsed.postId) postId = parsed.postId;
      }
    } catch (e) {}

    if (postId) {
      return `/post/${postId}`;
    }
    if (notification.type === 'visit') {
      return `/profile/${notification.senderId}`;
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
          
          <div className="w-16 flex justify-end">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[14px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Read all
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
                onClick={() => handleNotificationClick(notification)}
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
                      {notification.sender 
                        ? `${notification.sender.firstName} ${notification.sender.lastName}` 
                        : 'Someone'}
                    </span>
                    <span className="text-[13px] text-gray-700 whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className="text-[13px] text-gray-600 mt-0.5 truncate pr-2">
                    {notification.title || (notification.type === 'visit' ? 'New profile visit' : 'New notification')}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
