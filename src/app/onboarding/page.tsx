"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { Stepper } from "@/components/onboarding/stepper";
import { PersonalInfoForm } from "@/components/onboarding/personal-info-form";
import { LicensesStep } from "@/components/onboarding/licenses-step";
import { RatingsStep } from "@/components/onboarding/ratings-step";
import { WorkStep } from "@/components/onboarding/work-step";
import { ResumeStep } from "@/components/onboarding/resume-step";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let isMounted = true;

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
        .select("onboarded, accountType")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userRecord) {
        onboarded = !!userRecord.onboarded;
        accountType = userRecord.accountType || '';
      }

      // Fallback for Flight Crew if database trigger failed
      if (!onboarded || accountType === 'flight_crew') {
        const { data: resumeFallback } = await supabase
          .from('resumes')
          .select('data')
          .eq('userId', session.user.id)
          .maybeSingle();

        if (resumeFallback?.data) {
          accountType = 'flight_crew';
          onboarded = true;
        } else if (session.user.user_metadata?.onboarded === true && session.user.user_metadata?.accountType === 'flight_crew') {
          accountType = 'flight_crew';
          onboarded = true;
        }
        // NOTE: Do NOT check localStorage here — having onboarding_personal means
        // the user is MID-FLOW, not done. They need to reach step 5 and click Finish.
      }

      if (!isMounted) return;

      if (onboarded && !window.location.search.includes("edit=true")) {
        router.replace("/home");
        return;
      }

      if (accountType === "business") {
        router.replace("/onboarding-business");
        return;
      }

      setIsCheckingAccess(false);
    }

    redirectCompletedUsers();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      window.location.href = "/home";
    }
  };

  const handleBack = async () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      // Step 1: Go back to role selection
      router.push("/role-selection");
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1: return "Personal";
      case 2: return "Licenses";
      case 3: return "Ratings";
      case 4: return "Work";
      case 5: return "Resume";
      default: return "Onboarding";
    }
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
      {/* 
        Container simulates mobile width on large screens and full width on mobile 
      */}
      <div className="mx-auto max-w-xl h-screen flex flex-col px-4 sm:px-6">
        
        {/* Header */}
        <header className="flex items-center py-4 mt-2">
          {step === 1 ? (
            <button
              onClick={handleBack}
              className="p-2 border rounded-full hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          ) : (
            <button
              onClick={handleBack}
              className="p-2 border rounded-full hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <h1 className="flex-1 text-center text-xl font-bold pr-10">
            {getTitle()}
          </h1>
        </header>

        {/* Stepper */}
        <div className="mt-2 mb-4 px-2">
          <Stepper steps={5} currentStep={step} />
        </div>

        {/* Form Content based on Step */}
        {step === 1 && <PersonalInfoForm onNext={handleNext} />}
        {step === 2 && <LicensesStep onNext={handleNext} />}
        {step === 3 && <RatingsStep onNext={handleNext} />}
        {step === 4 && <WorkStep onNext={handleNext} />}
        {step === 5 && <ResumeStep onNext={handleNext} />}
      </div>
    </div>
  );
}
