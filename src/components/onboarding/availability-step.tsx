"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Check, Briefcase, UserCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { saveAvailabilityStatusAction } from "@/actions/profile";

interface AvailabilityStepProps {
  onNext?: (status: "active" | "available_for_work") => void | Promise<void>;
  onBack?: () => void;
  isSaving?: boolean;
}

// Map UI option to canonical DB value
// user_profiles.workAvailabilityStatus CHECK: 'active' OR 'available_for_work'
type UIStatus = "active" | "available";
const toCanonicalStatus = (s: UIStatus): "active" | "available_for_work" =>
  s === "active" ? "active" : "available_for_work";

export function AvailabilityStep({ onNext, onBack, isSaving: externalSaving }: AvailabilityStepProps) {
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = useState<UIStatus>("available");
  const [isLocalSaving, setIsLocalSaving] = useState(false);

  const effectiveSaving = Boolean(externalSaving || isLocalSaving);

  useEffect(() => {
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.availabilityStatus === "active" || parsed.availabilityStatus === "available") {
          setSelectedStatus(parsed.availabilityStatus);
        } else if (parsed.workAvailabilityStatus === "active" || parsed.workAvailabilityStatus === "available_for_work") {
          setSelectedStatus(parsed.workAvailabilityStatus === "active" ? "active" : "available");
        }
      }
    } catch (e) {
      console.error("Error reading saved availability status:", e);
    }
  }, []);

  const handleCompleteSetup = async () => {
    if (effectiveSaving) return;

    setIsLocalSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};
      const canonicalStatus = toCanonicalStatus(selectedStatus);

      const updated = {
        ...parsed,
        availabilityStatus: selectedStatus,
        workAvailabilityStatus: canonicalStatus,
        availability_status: canonicalStatus,
        category: "aviation_professional",
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      // Fast, canonical save to all tables via server action
      await saveAvailabilityStatusAction(canonicalStatus);

      if (onNext) {
        await onNext(canonicalStatus);
      } else {
        router.refresh();
        router.push("/home");
      }
    } catch (err) {
      console.error("Error saving availability status:", err);
      if (onNext) {
        await onNext(toCanonicalStatus(selectedStatus));
      }
    } finally {
      setIsLocalSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col mx-auto max-w-xl min-h-[100dvh] px-6 py-6">

        {/* 1. Top Bar: Left Back Button + Centered Prominent Logo */}
        <div className="relative flex items-center justify-center w-full pt-1 pb-5 min-h-[44px]">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50 cursor-pointer z-10"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[215px] sm:w-[245px] h-auto object-contain"
          />
        </div>

        {/* 2. Title, 6-Segment Progress Bar (All 6 blue) & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Availability
          </h1>

          {/* 6-Segment Progress Bar: All 6 in solid blue */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
          </div>

          <h2 className="text-base font-bold text-gray-900 mt-1">
            Work availability
          </h2>

          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Choose the status you want other aviation professionals and employers to see.
          </p>
        </div>

        {/* 3. Two Large Vertical Cards */}
        <div className="flex flex-col gap-4 flex-1 pt-1">
          
          {/* Card 1: Active / Employed */}
          <button
            type="button"
            onClick={() => setSelectedStatus("active")}
            className={cn(
              "w-full text-left p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-2xs",
              selectedStatus === "active"
                ? "border-[#1d4ed8] bg-blue-50/20 shadow-xs"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            )}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                Active / Employed
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                I am currently employed and not actively looking for work.
              </p>
            </div>

            {/* Check Circle Radio Indicator */}
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                selectedStatus === "active"
                  ? "bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-2xs"
                  : "border-gray-300 bg-white"
              )}
            >
              {selectedStatus === "active" && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </button>

          {/* Card 2: Available for Work */}
          <button
            type="button"
            onClick={() => setSelectedStatus("available")}
            className={cn(
              "w-full text-left p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-2xs",
              selectedStatus === "available"
                ? "border-[#1d4ed8] bg-blue-50/20 shadow-xs"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            )}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                Available for Work
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                I am open to relevant aviation opportunities.
              </p>
            </div>

            {/* Check Circle Radio Indicator */}
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                selectedStatus === "available"
                  ? "bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-2xs"
                  : "border-gray-300 bg-white"
              )}
            >
              {selectedStatus === "available" && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </button>

        </div>

        {/* 4. Bottom Complete Setup Button */}
        <div className="pb-8 pt-6">
          <button
            type="button"
            onClick={handleCompleteSetup}
            disabled={effectiveSaving}
            className={cn(
              "w-full py-4 rounded-full font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2.5 text-center text-sm",
              effectiveSaving && "opacity-80 cursor-not-allowed pointer-events-none"
            )}
          >
            {effectiveSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>Completing setup...</span>
              </>
            ) : (
              <span>Complete setup</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
