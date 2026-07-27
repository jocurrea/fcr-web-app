"use client";

import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/lib/supabase';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function initOneSignal() {
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      if (!appId) {
        console.warn("OneSignal App ID is missing. Push notifications disabled.");
        return;
      }

      try {
        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true, // Useful for testing on localhost
          notifyButton: {
            enable: true,
            displayPredicate: () => OneSignal.isPushNotificationsEnabled().then(enabled => !enabled),
          } as any,
        });
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing OneSignal:", error);
      }
    }

    if (!initialized && typeof window !== 'undefined') {
      initOneSignal();
    }
  }, [initialized]);

  useEffect(() => {
    if (!initialized) return;

    // Listen to Supabase auth state to login/logout of OneSignal
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Log the user into OneSignal using their Supabase User ID
        OneSignal.login(session.user.id).catch(err => console.error("OneSignal login error:", err));
      } else {
        // User logged out
        OneSignal.logout().catch(err => console.error("OneSignal logout error:", err));
      }
    });

    // Also check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        OneSignal.login(session.user.id).catch(err => console.error("OneSignal login error:", err));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized]);

  return <>{children}</>;
}
