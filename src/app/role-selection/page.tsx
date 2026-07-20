"use client";

import { useEffect, useState } from "react";
import { LogOut, ChevronRight, Users, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureBusinessDraft } from "@/lib/api/business";

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"flight_crew" | "business" | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const params = new URLSearchParams(window.location.search);
    const isExplicitEdit = params.get("edit") === "company" || params.get("from") === "profile";

    async function redirectCompletedUsers() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      let onboarded = false;
      let accounttype = '';

      const { data: userRecord } = await supabase
        .from("users")
        .select("onboarded, accounttype")
        .eq("id", session.user.id)
        .neq('id', 'bust-' + Math.random())
        .maybeSingle();

      if (userRecord) {
        onboarded = !!userRecord.onboarded;
        accounttype = userRecord.accounttype || '';
      }

      // Fallback: If the database trigger failed to create the users row, check if they have a company
      const { data: companies } = await supabase
        .from("companies")
        .select("status")
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (companies && companies.length > 0) {
        accounttype = "business";
        const status = companies[0].status;
        if (status === "approved" || status === "pending") {
          onboarded = true;
        }
      }

      // Fallback for Flight Crew if database trigger failed
      if (!onboarded || accounttype === 'flight_crew') {
        const { data: profileFallback } = await supabase
          .from('profiles')
          .select('crew_data')
          .eq('id', session.user.id)
          .neq('id', 'bust-' + Math.random())
          .maybeSingle();

        if (profileFallback?.crew_data) {
          accounttype = 'flight_crew';
          onboarded = true;
        }
      }

      if (!isMounted) return;

      if (!onboarded) {
        if (accounttype === "business") {
          const response = await ensureBusinessDraft();
          if (!isMounted) return;

          if (!response.success) {
            setError(response.error);
            setIsCheckingAccess(false);
            return;
          }

          router.replace("/onboarding-business");
          return;
        }

        if (accounttype === "flight_crew") {
          router.replace("/onboarding");
          return;
        }

        setIsCheckingAccess(false);
        return;
      }

      if (accounttype === "business") {
        if (!isMounted) return;

        if (companies?.[0]?.status === "rejected" && isExplicitEdit) {
          setIsCheckingAccess(false);
          return;
        }
      }

      window.location.href = "/home";
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

    if (selectedType === "flight_crew") {
      router.push("/onboarding");
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
        {/* Header */}
        <div className="flex items-center w-full mb-8">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50"
          >
            <LogOut className="w-5 h-5 text-gray-700 rotate-180" />
          </button>
        </div>

        {/* Titles */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            I want to join as
          </h1>
          <p className="text-sm text-gray-500">
            Select the option that best describes you to personalize your experience.
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Flight Crew Option */}
          <button
            onClick={() => setSelectedType("flight_crew")}
            className={`flex items-center p-5 rounded-2xl border ${
              selectedType === "flight_crew" 
                ? "border-[#2d73f5] bg-[#f0f5ff]" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            } shadow-sm transition-all text-left group`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 mr-4 transition-colors ${
              selectedType === "flight_crew" ? "bg-white text-[#2d73f5] shadow-sm" : "bg-[#f8fafc] text-gray-700"
            }`}>
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-0.5">Flight Crew</h2>
              <p className="text-xs text-gray-500 leading-snug">
                I am a pilot, cabin crew member or aviation professional.
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 shrink-0 ml-2 transition-colors ${selectedType === "flight_crew" ? "text-[#2d73f5]" : "text-gray-400"}`} />
          </button>

          {/* Business Option */}
          <button
            onClick={() => setSelectedType("business")}
            className={`flex items-center p-5 rounded-2xl border ${
              selectedType === "business" 
                ? "border-[#2d73f5] bg-[#f0f5ff]" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            } shadow-sm transition-all text-left group`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 mr-4 transition-colors ${
              selectedType === "business" ? "bg-[#d0e1ff] text-[#2d73f5]" : "bg-[#f8fafc] text-gray-700"
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-0.5">Business</h2>
              <p className="text-xs text-gray-500 leading-snug">
                I represent a company or organization in aviation.
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 shrink-0 ml-2 transition-colors ${selectedType === "business" ? "text-[#2d73f5]" : "text-gray-400"}`} />
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
            className="w-full py-4 rounded-full font-bold text-white transition-colors bg-[#2d73f5] hover:bg-[#2d73f5]/90 disabled:bg-[#85b0fa] disabled:cursor-not-allowed"
          >
            {isContinuing ? "Please wait..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
