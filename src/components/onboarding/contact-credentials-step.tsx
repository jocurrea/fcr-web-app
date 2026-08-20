"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { WorkAvailabilityStatus } from "@/components/profile/work-availability-status";

interface ContactCredentialsStepProps {
  onNext?: (data: { email: string; phone: string; licenseCertification: string }) => void;
  onBack?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{7,25}$/;

export function ContactCredentialsStep({ onNext, onBack }: ContactCredentialsStepProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseCertification, setLicenseCertification] = useState("");
  const [touched, setTouched] = useState({ email: false, phone: false, license: false });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const savedPersonal = localStorage.getItem("onboarding_personal");
        if (savedPersonal) {
          const parsed = JSON.parse(savedPersonal);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.licenseCertification) setLicenseCertification(parsed.licenseCertification);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email && !email) {
          setEmail(session.user.email);
        }
      } catch (e) {
        console.error("Error reading saved contact data:", e);
      }
    }
    loadInitialData();
  }, []);

  const isEmailEmpty = email.trim().length === 0;
  const isEmailFormatValid = EMAIL_REGEX.test(email.trim());
  const isEmailValid = !isEmailEmpty && isEmailFormatValid;

  const isPhoneEmpty = phone.trim().length === 0;
  const isPhoneFormatValid = PHONE_REGEX.test(phone.trim()) && (phone.match(/\d/g) || []).length >= 7;
  const isPhoneValid = !isPhoneEmpty && isPhoneFormatValid;

  const isLicenseValid = licenseCertification.trim().length > 0;

  const isFormValid = isEmailValid && isPhoneValid && isLicenseValid;

  const handleNextClick = async () => {
    setTouched({ email: true, phone: true, license: true });

    if (!isFormValid || isSaving) return;

    setIsSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};

      const updated = {
        ...parsed,
        email: email.trim(),
        phone: phone.trim(),
        licenseCertification: licenseCertification.trim(),
        category: "aviation_professional",
        role: "aviation_professional"
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Save into users table
        await supabase.from("users").upsert({
          id: session.user.id,
          email: email.trim(),
          phone: phone.trim(),
          accountType: "aviation_professional"
        }, { onConflict: "id" });

        // Save into resumes table
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

        const updatedLicenses = [
          ...(resumeData.licenses || []),
          {
            id: "license-main",
            name: licenseCertification.trim(),
            number: "N/A",
            country: "Global"
          }
        ];

        await supabase.from("resumes").upsert({
          userId: session.user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal,
            licenses: updatedLicenses
          }
        }, { onConflict: "userId" });
      }

      if (onNext) {
        onNext({
          email: email.trim(),
          phone: phone.trim(),
          licenseCertification: licenseCertification.trim()
        });
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving contact and credentials:", err);
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

        {/* 2. Title, 6-Segment Progress Bar (4 segments blue) & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Contact & Credentials
          </h1>

          {/* 6-Segment Progress Bar: Segments 1, 2, 3 & 4 blue, 5 & 6 gray */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
          </div>

          <p className="text-sm text-gray-500">
            Please provide your contact information and professional certifications.
          </p>
        </div>

        {/* 3. Form Fields (AC 1, AC 2 & AC 3) */}
        <div className="flex flex-col gap-5 flex-1">
          
          {/* Email Address */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="font-semibold text-gray-900 text-sm">
                Email <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              placeholder="e.g., alexander.wright@example.com"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.email && !isEmailValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
            {touched.email && isEmailEmpty && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field is required.
              </p>
            )}
            {touched.email && !isEmailEmpty && !isEmailFormatValid && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Please enter a valid email address.
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="phone" className="font-semibold text-gray-900 text-sm">
                Phone <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
              placeholder="e.g., +1 (555) 234-5678"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.phone && !isPhoneValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
            {touched.phone && isPhoneEmpty && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field is required.
              </p>
            )}
            {touched.phone && !isPhoneEmpty && !isPhoneFormatValid && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Please enter a valid phone number.
              </p>
            )}
          </div>

          {/* Licenses / Certifications */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="licenseCertification" className="font-semibold text-gray-900 text-sm">
                Licenses / Certifications <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="licenseCertification"
              type="text"
              value={licenseCertification}
              onChange={(e) => setLicenseCertification(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, license: true }))}
              placeholder="e.g., FAA Commercial Pilot, EASA Part-66"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.license && !isLicenseValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
            {touched.license && !isLicenseValid && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field is required.
              </p>
            )}
          </div>

          {/* Professional Status (Work Availability - E01-HU09) */}
          <div className="pt-2 border-t border-gray-100">
            <WorkAvailabilityStatus showCardWrapper={false} />
          </div>

        </div>

        {/* 4. Bottom Next Button */}
        <div className="pb-8 pt-4">
          <button
            type="button"
            onClick={handleNextClick}
            disabled={!isFormValid || isSaving}
            className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
              isFormValid && !isSaving
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
