import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export type Notification = {
  id: number;
  created_at: string;
  title: string;
  senderId: string;
  receiverId: string;
  data: string;
  read: number;
  type: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string;
  };
};

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('receiverId', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Notifications fetch error:", error);
        setErrorMsg(error.message);
        return;
      }

      if (data) {
        // Fetch sender details
        const senderIds = Array.from(
          new Set(data.map((n) => n.senderId || (n as any).sender_id).filter(Boolean))
        ) as string[];
        
        if (senderIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, firstName, lastName, profileImage')
            .in('id', senderIds);
            
          if (usersData) {
            const userMap = new Map(usersData.map((u) => [u.id, u]));
            data.forEach((n) => {
              const sId = n.senderId || (n as any).sender_id;
              if (sId && userMap.has(sId)) {
                n.sender = userMap.get(sId);
              }
            });
          }
        }

        setNotifications(data);
        setUnreadCount(data.filter((n) => n.read === 0).length);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes
    const channelId = `schema-db-changes-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiverId=eq.${userId}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          const sId = newNotification.senderId || (newNotification as any).sender_id || (newNotification as any).userId;
          
          if (sId) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('id, firstName, lastName, profileImage')
                .eq('id', sId)
                .maybeSingle();
              if (userData) {
                newNotification.sender = userData;
              }
            } catch (err) {
              console.error('Error fetching sender info for realtime notification:', err);
            }
          }
          
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `receiverId=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? { ...updatedNotification, sender: n.sender } : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Automatically recalculate unread count whenever notifications array changes
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => n.read === 0 || (n.read as any) === false).length);
  }, [notifications]);

  const markAsRead = async (notificationId: number) => {
    // Optimistic update for better UX
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: 1 } : n))
    );
    await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: 1 }))
    );
    
    await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('receiverId', userId)
      .eq('read', 0);
  };

  return {
    notifications,
    unreadCount,
    errorMsg,
    markAsRead,
    markAllAsRead,
  };
}
