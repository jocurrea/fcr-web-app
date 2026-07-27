"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, User } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";

export function NotificationsBell() {
  const [userId, setUserId] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    });
  }, []);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.read === 0) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    if (type === 'visit') return <User className="w-4 h-4 text-blue-500" />;
    if (type === 'like') return <span className="text-red-500 text-sm">❤️</span>;
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-600 hover:text-black transition-colors p-1"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.type === 'visit' || notification.type === 'like' ? `/profile/${notification.senderId}` : "#"}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${notification.read === 0 ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="mt-1 flex-shrink-0 bg-gray-100 p-2 rounded-full h-8 w-8 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800 font-medium">
                      {notification.title || (notification.type === 'visit' ? 'New profile visit' : 'New notification')}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {notification.data}
                    </span>
                  </div>
                  {notification.read === 0 && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 ml-auto mt-2"></div>
                  )}
                </Link>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full text-center px-4 py-2 mt-2 text-sm text-blue-600 font-medium hover:bg-gray-50 border-t border-gray-100"
            >
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
