"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { revalidateProfileLayout } from "@/actions/profile";

export type AvailabilityStatus = "active" | "available_for_work";

interface WorkAvailabilityStatusProps {
  value?: AvailabilityStatus;
  defaultValue?: AvailabilityStatus;
  onChange?: (status: AvailabilityStatus) => void;
  className?: string;
  showCardWrapper?: boolean;
  syncWithBackend?: boolean;
}

export function WorkAvailabilityStatus({
  value,
  defaultValue = "active",
  onChange,
  className,
  showCardWrapper = true,
  syncWithBackend = true,
}: WorkAvailabilityStatusProps) {
  const [internalStatus, setInternalStatus] = useState<AvailabilityStatus>(
    value || defaultValue
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync internal state with controlled prop if provided
  useEffect(() => {
    if (value !== undefined) {
      setInternalStatus(value);
    }
  }, [value]);

  // Load initial status from localStorage or session on mount if uncontrolled
  useEffect(() => {
    if (value === undefined) {
      try {
        const savedPersonal = localStorage.getItem("onboarding_personal");
        if (savedPersonal) {
          const parsed = JSON.parse(savedPersonal);
          if (
            parsed.availabilityStatus === "active" ||
            parsed.availabilityStatus === "available_for_work"
          ) {
            setInternalStatus(parsed.availabilityStatus);
          } else if (parsed.workAvailability) {
            setInternalStatus(
              parsed.workAvailability === "available"
                ? "available_for_work"
                : "active"
            );
          }
        }
      } catch (e) {
        console.error("Error reading availability from localStorage:", e);
      }
    }
  }, [value]);

  const handleStatusChange = async (newStatus: AvailabilityStatus) => {
    if (internalStatus === newStatus) return;

    // Immediate UI feedback (AC 3)
    setInternalStatus(newStatus);
    if (onChange) {
      onChange(newStatus);
    }

    // Persist in localStorage
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      const parsed = savedPersonal ? JSON.parse(savedPersonal) : {};
      parsed.availabilityStatus = newStatus;
      parsed.workAvailability =
        newStatus === "available_for_work" ? "available" : "active";
      localStorage.setItem("onboarding_personal", JSON.stringify(parsed));
    } catch (e) {
      console.error("Error writing availability to localStorage:", e);
    }

    // Persist to backend Supabase if enabled
    if (syncWithBackend) {
      setIsUpdating(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // Update users record
          await supabase
            .from("users")
            .update({
              availability_status: newStatus,
              work_availability:
                newStatus === "available_for_work" ? "available" : "active",
            })
            .eq("id", session.user.id);

          // Update resume data
          const { data: resumeData } = await supabase
            .from("resumes")
            .select("data")
            .eq("userId", session.user.id)
            .maybeSingle();

          if (resumeData?.data) {
            const currentData = resumeData.data as any;
            const updatedPersonal = {
              ...(currentData.personal || {}),
              availabilityStatus: newStatus,
              workAvailability:
                newStatus === "available_for_work" ? "available" : "active",
            };

            await supabase
              .from("resumes")
              .update({
                data: {
                  ...currentData,
                  personal: updatedPersonal,
                },
              })
              .eq("userId", session.user.id);
          }

          // Re-fetch get_my_profile RPC and revalidate server layout
          await supabase.rpc("get_my_profile");
          await revalidateProfileLayout();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("profile-updated"));
          }
        }
      } catch (err) {
        console.error("Error syncing availability to backend:", err);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const content = (
    <div className="space-y-3">
      {/* 1. Header (AC 1) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 leading-tight">
            Professional Status
          </h3>
          {internalStatus === "available_for_work" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 animate-in fade-in duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Open to offers
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
          Let employers and companies know your current availability.
        </p>
      </div>

      {/* 2. Segmented Control / Toggle (AC 1 & AC 2) */}
      <div className="p-1 bg-gray-100/90 rounded-2xl flex items-center border border-gray-200/80 gap-1 select-none">
        {/* Option 1: "Active" */}
        <button
          type="button"
          onClick={() => handleStatusChange("active")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 text-center cursor-pointer flex items-center justify-center gap-2",
            internalStatus === "active"
              ? "bg-[#1d4ed8] text-white shadow-sm"
              : "bg-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 font-medium"
          )}
        >
          Active
        </button>

        {/* Option 2: "Available for work" */}
        <button
          type="button"
          onClick={() => handleStatusChange("available_for_work")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 text-center cursor-pointer flex items-center justify-center gap-2",
            internalStatus === "available_for_work"
              ? "bg-[#1d4ed8] text-white shadow-sm"
              : "bg-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 font-medium"
          )}
        >
          {/* Green dot indicator (AC 2) */}
          <span
            className={cn(
              "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all shrink-0",
              internalStatus === "available_for_work"
                ? "bg-emerald-400 ring-2 ring-white/30 animate-pulse"
                : "bg-emerald-500/70"
            )}
          />
          <span>Available for work</span>
        </button>
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-2xl border border-gray-200/90 bg-white shadow-xs transition-all",
        className
      )}
    >
      {content}
    </div>
  );
}
