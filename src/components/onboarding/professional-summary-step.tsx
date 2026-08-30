"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProfessionalSummaryStepProps {
  onNext?: (summary: string) => void;
  onBack?: () => void;
}

const MAX_CHARACTERS = 500;

export function ProfessionalSummaryStep({ onNext, onBack }: ProfessionalSummaryStepProps) {
  const router = useRouter();
  const [aboutMe, setAboutMe] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.aboutMe) {
          setAboutMe(parsed.aboutMe.slice(0, MAX_CHARACTERS));
        } else if (parsed.description) {
          setAboutMe(parsed.description.slice(0, MAX_CHARACTERS));
        }
      }
    } catch (e) {
      console.error("Error reading saved aboutMe data:", e);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_CHARACTERS);
    setAboutMe(value);
    if (!touched) setTouched(true);
  };

  const isAboutMeValid = aboutMe.trim().length > 0;

  const handleNextClick = async () => {
    setTouched(true);
    if (!isAboutMeValid || isSaving) return;

    setIsSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};

      const updated = {
        ...parsed,
        aboutMe: aboutMe.trim(),
        description: aboutMe.trim(),
        category: "aviation_professional",
        role: "aviation_professional"
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Save description/aboutMe into resumes table
        const { data: currentResume } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", session.user.id)
          .maybeSingle();

        const resumeData = (currentResume?.data as any) || {};
        const updatedPersonal = {
          ...(resumeData.personal || {}),
          ...updated
        };

        await supabase.from("resumes").upsert({
          userId: session.user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal
          }
        }, { onConflict: "userId" });
      }

      if (onNext) {
        onNext(aboutMe.trim());
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving about me summary:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col mx-auto max-w-xl min-h-[100dvh] px-6 py-6">

        {/* 1. Top Bar: Left Back Button + Centered Subtle Logo */}
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

        {/* 2. Title, 6-Segment Progress Bar (3 segments blue), Subtitle & Description */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            About Me
          </h1>

          {/* 6-Segment Progress Bar: Segments 1, 2 & 3 blue, 4, 5 & 6 gray */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
          </div>

          <h2 className="text-base font-bold text-gray-900 mt-1">
            Share your professional story
          </h2>

          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Summarize your qualifications, expertise, and career background so others can understand what you bring to aviation.
          </p>
        </div>

        {/* 3. Text Area Component with Top Counter and Bottom Helper Text */}
        <div className="flex flex-col gap-2 flex-1">
          {/* Label + Top-Aligned Character Counter in the same row */}
          <div className="flex items-center justify-between px-0.5">
            <Label htmlFor="aboutMe" className="font-semibold text-gray-900 text-sm">
              About Me <span className="text-red-500">*</span>
            </Label>

            <span
              className={cn(
                "text-xs font-medium",
                aboutMe.length >= MAX_CHARACTERS
                  ? "text-amber-600 font-bold"
                  : "text-gray-400"
              )}
            >
              {aboutMe.length} / {MAX_CHARACTERS}
            </span>
          </div>

          <div className="relative">
            <Textarea
              id="aboutMe"
              rows={6}
              maxLength={MAX_CHARACTERS}
              value={aboutMe}
              onChange={handleChange}
              onBlur={() => setTouched(true)}
              placeholder="Write a short overview of your professional background"
              className={cn(
                "w-full rounded-2xl p-4 text-sm bg-white border transition-all resize-none min-h-[160px] leading-relaxed",
                touched && !isAboutMeValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
          </div>

          {/* Helper Text below textarea in faint gray */}
          <p className="text-xs text-gray-400 mt-0.5 px-0.5">
            Keep it focused and relevant to your aviation experience.
          </p>

          {/* Validation Error Message */}
          {touched && !isAboutMeValid && (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1 px-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              This field is required.
            </p>
          )}
        </div>

        {/* 4. Bottom Next Button */}
        <div className="pb-8 pt-4">
          <button
            type="button"
            onClick={handleNextClick}
            disabled={!isAboutMeValid || isSaving}
            className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
              isAboutMeValid && !isSaving
                ? "bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer"
                : "bg-[#85b0fa] cursor-not-allowed opacity-90"
            }`}
          >
            {isSaving ? "Please wait..." : "Next"}
          </button>
        </div>

      </div>
    </div>
  );
}
