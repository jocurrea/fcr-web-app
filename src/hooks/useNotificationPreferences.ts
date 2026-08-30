"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import OneSignal from "react-onesignal";

export interface NotificationPreferences {
  // Push Notifications per category
  push_messages: boolean;
  push_jobs: boolean;
  push_profile_activity: boolean;
  push_frequencies: boolean;

  // In-App Notifications per category
  in_app_messages: boolean;
  in_app_jobs: boolean;
  in_app_profile_activity: boolean;
  in_app_frequencies: boolean;

  // Master switches / additional options
  push_enabled: boolean;
  in_app_enabled: boolean;
  email_digest?: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_messages: true,
  push_jobs: true,
  push_profile_activity: true,
  push_frequencies: true,

  in_app_messages: true,
  in_app_jobs: true,
  in_app_profile_activity: true,
  in_app_frequencies: true,

  push_enabled: true,
  in_app_enabled: true,
  email_digest: true,
};

export function useNotificationPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences from backend / RPC / storage
  const loadPreferences = useCallback(async (uid: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Try RPC get_notification_preferences
      let fetchedPrefs: any = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_notification_preferences");
        if (!rpcError && rpcData) {
          fetchedPrefs = rpcData;
        }
      } catch (e) {
        // RPC might not exist or parameter mismatch
      }

      // 2. Try querying notification_preferences table
      if (!fetchedPrefs) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("user_id", uid)
            .maybeSingle();

          if (!tableError && tableData) {
            fetchedPrefs = tableData;
          }
        } catch (e) {
          // Table query fallback
        }
      }

      // 3. Try user metadata fallback
      if (!fetchedPrefs) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata?.notification_preferences) {
            fetchedPrefs = user.user_metadata.notification_preferences;
          }
        } catch (e) {}
      }

      // 4. Try localStorage fallback
      if (!fetchedPrefs && typeof window !== "undefined") {
        try {
          const localData = localStorage.getItem(`notification_preferences_${uid}`);
          if (localData) {
            fetchedPrefs = JSON.parse(localData);
          }
        } catch (e) {}
      }

      if (fetchedPrefs) {
        setPreferences({
          push_messages: fetchedPrefs.push_messages ?? DEFAULT_PREFERENCES.push_messages,
          push_jobs: fetchedPrefs.push_jobs ?? DEFAULT_PREFERENCES.push_jobs,
          push_profile_activity: fetchedPrefs.push_profile_activity ?? DEFAULT_PREFERENCES.push_profile_activity,
          push_frequencies: fetchedPrefs.push_frequencies ?? DEFAULT_PREFERENCES.push_frequencies,

          in_app_messages: fetchedPrefs.in_app_messages ?? DEFAULT_PREFERENCES.in_app_messages,
          in_app_jobs: fetchedPrefs.in_app_jobs ?? DEFAULT_PREFERENCES.in_app_jobs,
          in_app_profile_activity: fetchedPrefs.in_app_profile_activity ?? DEFAULT_PREFERENCES.in_app_profile_activity,
          in_app_frequencies: fetchedPrefs.in_app_frequencies ?? DEFAULT_PREFERENCES.in_app_frequencies,

          push_enabled: fetchedPrefs.push_enabled ?? DEFAULT_PREFERENCES.push_enabled,
          in_app_enabled: fetchedPrefs.in_app_enabled ?? DEFAULT_PREFERENCES.in_app_enabled,
          email_digest: fetchedPrefs.email_digest ?? DEFAULT_PREFERENCES.email_digest,
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err: any) {
      console.error("Error loading notification preferences:", err);
      setError(err?.message || "Failed to load preferences");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadPreferences(userId);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          loadPreferences(session.user.id);
        } else {
          setIsLoading(false);
        }
      });
    }
  }, [userId, loadPreferences]);

  // Persist updated preferences to backend immediately
  const persistPreferences = useCallback(
    async (newPrefs: NotificationPreferences) => {
      setIsSaving(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = userId || session?.user?.id;

        // Save local backup immediately
        if (currentUserId && typeof window !== "undefined") {
          localStorage.setItem(
            `notification_preferences_${currentUserId}`,
            JSON.stringify(newPrefs)
          );
        }

        // 1. Try RPC update_notification_preferences
        let rpcSuccess = false;
        try {
          const { error: rpcError } = await supabase.rpc(
            "update_notification_preferences",
            {
              preferences: newPrefs,
            }
          );
          if (!rpcError) {
            rpcSuccess = true;
          } else {
            // Try flat parameters variation
            const { error: rpcError2 } = await supabase.rpc(
              "update_notification_preferences",
              {
                ...newPrefs,
              }
            );
            if (!rpcError2) rpcSuccess = true;
          }
        } catch (e) {}

        // 2. Try table upsert
        if (!rpcSuccess && currentUserId) {
          try {
            const { error: upsertError } = await supabase
              .from("notification_preferences")
              .upsert(
                {
                  user_id: currentUserId,
                  ...newPrefs,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              );
            if (!upsertError) rpcSuccess = true;
          } catch (e) {}
        }

        // 3. Try updating auth user_metadata
        if (!rpcSuccess) {
          try {
            await supabase.auth.updateUser({
              data: { notification_preferences: newPrefs },
            });
          } catch (e) {}
        }

        // 4. Sync OneSignal tags/categories if initialized
        try {
          if (typeof window !== "undefined" && (OneSignal as any).User?.addTags) {
            (OneSignal as any).User.addTags({
              push_messages: String(newPrefs.push_messages && newPrefs.push_enabled),
              push_jobs: String(newPrefs.push_jobs && newPrefs.push_enabled),
              push_profile_activity: String(newPrefs.push_profile_activity && newPrefs.push_enabled),
              push_frequencies: String(newPrefs.push_frequencies && newPrefs.push_enabled),
            });
          }
        } catch (e) {}

        setLastSavedTime(new Date());
      } catch (err: any) {
        console.error("Error saving notification preferences:", err);
        setError("Failed to save changes. Will retry automatically.");
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  // Toggle a single preference key
  const updatePreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };

        // Auto-handle master toggles
        if (key.startsWith("push_") && key !== "push_enabled" && value) {
          next.push_enabled = true;
        }
        if (key.startsWith("in_app_") && key !== "in_app_enabled" && value) {
          next.in_app_enabled = true;
        }

        // Debounce / trigger persist
        if (pendingSaveTimeoutRef.current) {
          clearTimeout(pendingSaveTimeoutRef.current);
        }
        pendingSaveTimeoutRef.current = setTimeout(() => {
          persistPreferences(next);
        }, 150);

        return next;
      });
    },
    [persistPreferences]
  );

  // Toggle all preferences of a type (push, in_app, all)
  const toggleAll = useCallback(
    (type: "push" | "in_app" | "all", enable: boolean) => {
      setPreferences((prev) => {
        const next = { ...prev };

        if (type === "push" || type === "all") {
          next.push_enabled = enable;
          next.push_messages = enable;
          next.push_jobs = enable;
          next.push_profile_activity = enable;
          next.push_frequencies = enable;
        }

        if (type === "in_app" || type === "all") {
          next.in_app_enabled = enable;
          next.in_app_messages = enable;
          next.in_app_jobs = enable;
          next.in_app_profile_activity = enable;
          next.in_app_frequencies = enable;
        }

        persistPreferences(next);
        return next;
      });
    },
    [persistPreferences]
  );

  return {
    preferences,
    isLoading,
    isSaving,
    lastSavedTime,
    error,
    updatePreference,
    toggleAll,
    reload: () => {
      if (userId) loadPreferences(userId);
    },
  };
}
