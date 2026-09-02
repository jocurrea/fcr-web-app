"use client";

import { useEffect, useState } from "react";
import { LogOut, Users, User, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureBusinessDraft } from "@/lib/api/business";

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"flight_crew" | "business" | "aviation_professional" | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const params = new URLSearchParams(window.location.search);
    const isProfileEdit = params.get("from") === "profile" || params.get("edit") === "company";

    async function redirectCompletedUsers() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      let onboarded = false;
      let accountType = '';

      const { data: userRecord } = await supabase
        .from("users")
        .select("onboarded, accountType, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userRecord) {
        onboarded =
          userRecord.onboarded === 1 ||
          userRecord.onboarded === true ||
          String(userRecord.onboarded) === "1" ||
          String(userRecord.onboarded).toLowerCase() === "true" ||
          session.user.user_metadata?.onboarded === true;
        accountType = userRecord.accountType || userRecord.role || '';
      }

      // Fallback: If company approved, active or pending
      const { data: companies } = await supabase
        .from("companies")
        .select("status")
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (companies && companies.length > 0) {
        accountType = "business";
        const status = companies[0].status;
        if (status === "approved" || status === "pending" || status === "active") {
          onboarded = true;
        }
      }

      // Check resume fallback for flight crew / aviation professional
      if (!onboarded) {
        const { data: resumeData } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", session.user.id)
          .maybeSingle();

        if (resumeData?.data) {
          onboarded = true;
        }
      }

      if (!isMounted) return;

      // If user is already onboarded:
      if (onboarded) {
        // Only allow if explicitly editing from profile
        if (isProfileEdit) {
          setIsCheckingAccess(false);
          return;
        }

        // Clean residual URL params and force redirect to /home
        if (typeof window !== "undefined") {
          try {
            document.cookie = "flightcrew_onboarded=true; path=/; max-age=31536000";
            sessionStorage.setItem("flightcrew_onboarded", "true");
            localStorage.setItem("flightcrew_onboarded", "true");
            window.history.replaceState(null, "", "/home");
          } catch (e) {}
          window.location.replace("/home");
        } else {
          router.replace("/home");
        }
        return;
      }

      // If user is a new / non-onboarded user:
      // Clean any residual parameters (?edit=true&from=onboarding)
      if (typeof window !== "undefined" && (params.has("edit") || params.has("from"))) {
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch (e) {}
      }

      if (accountType === "business" && !isProfileEdit) {
        if (typeof window !== "undefined") {
          window.location.replace("/onboarding-business");
        } else {
          router.replace("/onboarding-business");
        }
        return;
      }

      setIsCheckingAccess(false);
    }

    redirectCompletedUsers();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleContinue = async () => {
    if (!selectedType || isContinuing) return;

    setIsContinuing(true);
    setError(null);

    if (selectedType === "flight_crew" || selectedType === "aviation_professional") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.allSettled([
          supabase.auth.updateUser({ data: { accountType: selectedType } }),
          supabase.from("users").update({ accountType: selectedType }).eq("id", user.id),
          supabase.from("users").upsert({ id: user.id, accountType: selectedType }, { onConflict: "id" })
        ]);
      }

      try {
        const existing = localStorage.getItem("onboarding_personal");
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem("onboarding_personal", JSON.stringify({
          ...parsed,
          category: selectedType,
          role: selectedType === "aviation_professional" ? "aviation_professional" : (parsed.role || "pilot")
        }));
      } catch (e) {}
      
      router.push(`/onboarding?category=${selectedType}`);
      return;
    }

    const response = await ensureBusinessDraft();
    setIsContinuing(false);

    if (!response.success) {
      setError(response.error);
      return;
    }

    router.push("/onboarding-business");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col mx-auto max-w-xl min-h-[100dvh] px-6 py-8">
        {/* Top Header with Left Back Button & Centered Logo */}
        <div className="relative flex items-center justify-center w-full pt-2 pb-6">
          <button 
            onClick={handleLogout}
            className="absolute left-0 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50 cursor-pointer"
            title="Back / Logout"
          >
            <LogOut className="w-5 h-5 text-gray-700 rotate-180" />
          </button>

          <img 
            src="/img/FCRlogo2.png" 
            alt="Flight Crew Ranked" 
            className="w-[215px] sm:w-[245px] h-auto object-contain" 
          />
        </div>

        {/* Titles */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Create Account
          </h1>
          <p className="text-sm text-gray-500">
            Choose how you want to join Flight Crew Ranked
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-4 flex-1">
          {/* 1. Flight Crew Option */}
          <button
            type="button"
            onClick={() => setSelectedType("flight_crew")}
            className={`flex items-center p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
              selectedType === "flight_crew" 
                ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                : "border-gray-100 hover:border-gray-200 bg-white shadow-xs"
            }`}
          >
            <div className="shrink-0 mr-4 flex items-center justify-center">
              <Users className="w-7 h-7 text-[#1d4ed8] fill-[#1d4ed8]" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Flight Crew</h2>
              </div>
              <p className="text-xs text-gray-500 leading-snug mt-0.5">
                For pilots and cabin crew members.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
              selectedType === "flight_crew" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
            }`}>
              {selectedType === "flight_crew" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
          </button>

          {/* 2. Business Option */}
          <button
            type="button"
            onClick={() => setSelectedType("business")}
            className={`flex items-center p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
              selectedType === "business" 
                ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                : "border-gray-100 hover:border-gray-200 bg-white shadow-xs"
            }`}
          >
            <div className="shrink-0 mr-4 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#1d4ed8]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 21V9l6-4v16H4zm8 0V3l8 4v14h-8zm-6-4h2v-2H6v2zm0-4h2v-2H6v2zm8 4h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Company / Business</h2>
              </div>
              <p className="text-xs text-gray-500 leading-snug mt-0.5">
                For aviation companies and organizations.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
              selectedType === "business" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
            }`}>
              {selectedType === "business" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
          </button>

          {/* 3. Aviation Professional Option */}
          <button
            type="button"
            onClick={() => setSelectedType("aviation_professional")}
            className={`flex items-center p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
              selectedType === "aviation_professional" 
                ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                : "border-gray-100 hover:border-gray-200 bg-white shadow-xs"
            }`}
          >
            <div className="shrink-0 mr-4 flex items-center justify-center">
              <User className="w-7 h-7 text-[#1d4ed8] fill-[#1d4ed8]" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Aviation Professional</h2>
              </div>
              <p className="text-xs text-gray-500 leading-snug mt-0.5">
                For aviation professionals and specialists.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
              selectedType === "aviation_professional" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
            }`}>
              {selectedType === "aviation_professional" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="pb-8 pt-4">
          <button
            onClick={handleContinue}
            disabled={!selectedType || isContinuing}
            className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
              selectedType && !isContinuing
                ? "bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer" 
                : "bg-[#85b0fa] cursor-not-allowed opacity-90"
            }`}
          >
            {isContinuing ? "Please wait..." : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
