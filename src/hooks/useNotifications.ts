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
    firstName?: string | null;
    lastName?: string | null;
    profileImage?: string | null;
    companyName?: string | null;
    username?: string | null;
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
        const getSenderId = (n: any) => n.senderId || n.sender_id || n.latestSenderId || n.latest_sender_id;

        // Fetch sender details
        const senderIds = Array.from(
          new Set(data.map(getSenderId).filter(Boolean))
        ) as string[];
        
        if (senderIds.length > 0) {
          const [{ data: usersData }, { data: companiesData }] = await Promise.all([
            supabase
              .from('users')
              .select('id, firstName, lastName, profileImage, username')
              .in('id', senderIds),
            supabase
              .from('companies')
              .select('owner_user_id, name, logo_url')
              .in('owner_user_id', senderIds)
          ]);
            
          const companyMap = new Map((companiesData || []).map((c) => [c.owner_user_id, c]));
          const userMap = new Map();
          
          (usersData || []).forEach((u: any) => {
            const comp = companyMap.get(u.id);
            userMap.set(u.id, {
              ...u,
              companyName: comp?.name || null,
              profileImage: u.profileImage || comp?.logo_url || null
            });
          });

          // Also set any company-only senders
          (companiesData || []).forEach((c: any) => {
            if (!userMap.has(c.owner_user_id)) {
              userMap.set(c.owner_user_id, {
                id: c.owner_user_id,
                companyName: c.name,
                profileImage: c.logo_url
              });
            }
          });

          data.forEach((n) => {
            const sId = getSenderId(n);
            if (sId && userMap.has(sId)) {
              n.sender = userMap.get(sId);
            }
          });
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
              const [{ data: userData }, { data: compData }] = await Promise.all([
                supabase
                  .from('users')
                  .select('id, firstName, lastName, profileImage, username')
                  .eq('id', sId)
                  .maybeSingle(),
                supabase
                  .from('companies')
                  .select('name, logo_url')
                  .eq('owner_user_id', sId)
                  .maybeSingle()
              ]);
              if (userData) {
                newNotification.sender = {
                  ...userData,
                  companyName: compData?.name || null,
                  profileImage: userData.profileImage || compData?.logo_url || null
                };
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

  const deleteNotification = async (notificationId: number) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  };

  const clearAllNotifications = async () => {
    if (!userId) return;
    
    // Optimistic update
    setNotifications([]);
    
    await supabase
      .from('notifications')
      .delete()
      .eq('receiverId', userId);
  };

  return {
    notifications,
    unreadCount,
    errorMsg,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };
}
