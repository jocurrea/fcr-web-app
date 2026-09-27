"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Emergency redirect page for flight crew onboarding completion.
 * This page sets the cookie and redirects to /home, bypassing all auth checks.
 * Called directly by ResumeStep after saving data.
 */
export default function OnboardingCompletePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      // Set the cookie on this page as well (belt and suspenders)
      document.cookie = "flightcrew_onboarded=true; path=/; max-age=31536000; SameSite=Lax";
      
      // Also set in sessionStorage as another fallback
      sessionStorage.setItem("flightcrew_onboarded", "true");
      localStorage.setItem("flightcrew_onboarded", "true");
    } catch (e) {
      console.error("Storage error in onboarding-complete:", e);
    }
    
    // Invalidate server cache and navigate to destination
    router.refresh();

    let destination = "/home";
    if (typeof window !== "undefined") {
      const pendingInvite = sessionStorage.getItem("fcr_invitation_token") || sessionStorage.getItem("pending_invite_token");
      const redirectUrl = sessionStorage.getItem("auth_redirect_url");
      if (pendingInvite || redirectUrl === "/invitations/accept") {
        destination = "/invitations/accept";
      } else if (redirectUrl && redirectUrl.startsWith("/")) {
        sessionStorage.removeItem("auth_redirect_url");
        destination = redirectUrl;
      }
    }
    router.replace(destination);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500 text-sm">Setting up your profile...</p>
    </div>
  );
}
