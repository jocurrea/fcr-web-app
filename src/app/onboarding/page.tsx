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
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

      // Check edit mode early
      const editMode = window.location.search.includes("edit=true");
      setIsEditMode(editMode);

      // Fallback for Flight Crew if database trigger failed
      if (!onboarded || accountType === 'flight_crew' || editMode) {
        const { data: resumeFallback } = await supabase
          .from('resumes')
          .select('data')
          .eq('userId', session.user.id)
          .maybeSingle();

        if (resumeFallback?.data) {
          accountType = 'flight_crew';
          onboarded = true;
          
          if (editMode) {
            const crewData = resumeFallback.data as any;
            if (crewData.personal) localStorage.setItem("onboarding_personal", JSON.stringify(crewData.personal));
            if (crewData.licenses) localStorage.setItem("onboarding_licenses", JSON.stringify(crewData.licenses));
            if (crewData.ratings) localStorage.setItem("onboarding_ratings", JSON.stringify(crewData.ratings));
            if (crewData.work) localStorage.setItem("onboarding_work", JSON.stringify(crewData.work));
            if (crewData.resume) localStorage.setItem("onboarding_resume", JSON.stringify(crewData.resume));

            // Fetch profileImage to show in the form
            const { data: uRecord } = await supabase.from('users').select('profileImage').eq('id', session.user.id).maybeSingle();
            if (uRecord?.profileImage) {
              localStorage.setItem("userProfilePhoto", uRecord.profileImage);
            }
          }
        } else if (session.user.user_metadata?.onboarded === true && session.user.user_metadata?.accountType === 'flight_crew') {
          accountType = 'flight_crew';
          onboarded = true;
        }
        // NOTE: Do NOT check localStorage here — having onboarding_personal means
        // the user is MID-FLOW, not done. They need to reach step 5 and click Finish.
      }

      if (!isMounted) return;

      if (onboarded && !editMode) {
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

  const totalSteps = isEditMode ? 5 : 2;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.assign("/home");
        return;
      }

      const personalRaw = localStorage.getItem("onboarding_personal");
      const licensesRaw = localStorage.getItem("onboarding_licenses");
      const ratingsRaw = localStorage.getItem("onboarding_ratings");
      const workRaw = localStorage.getItem("onboarding_work");
      const resumeRaw = localStorage.getItem("onboarding_resume");
      const avatarPhoto = localStorage.getItem("userProfilePhoto");
      
      const personalData = personalRaw ? JSON.parse(personalRaw) : null;

      const crewData = {
        personal: personalData || {},
        licenses: licensesRaw ? JSON.parse(licensesRaw) : [],
        ratings: ratingsRaw ? JSON.parse(ratingsRaw) : [],
        work: workRaw ? JSON.parse(workRaw) : {},
        resume: resumeRaw ? JSON.parse(resumeRaw) : {},
      };

      const results = await Promise.allSettled([
        supabase.from('resumes').upsert({
          userId: session.user.id,
          data: crewData
        }, { onConflict: 'userId' }),

        supabase.from('users').upsert({
          id: session.user.id,
          firstName: personalData?.firstName || "Unknown",
          lastName: personalData?.lastName || "",
          ...(avatarPhoto ? { profileImage: avatarPhoto } : {}),
          onboarded: 1,
          accountType: 'flight_crew'
        }, { onConflict: 'id' }),

        supabase.auth.updateUser({
          data: {
            onboarded: true,
            accountType: 'flight_crew',
            crew_data_saved: true
          }
        })
      ]);

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.error));
      if (failed.length > 0) {
        console.error("Save failed:", failed);
        alert("There was an error saving your profile. Please check your connection and try again.");
        setIsSaving(false);
        return;
      }

      supabase.auth.refreshSession().catch(e => console.error('refresh error:', e));

    } catch (err: any) {
      console.error("[Onboarding] Sync error:", err);
    } finally {
      try {
        document.cookie = "flightcrew_onboarded=true; path=/; max-age=31536000";
        sessionStorage.setItem("flightcrew_onboarded", "true");
        localStorage.setItem("flightcrew_onboarded", "true");
      } catch (e) {
        console.error("Storage error:", e);
      }
      
      setIsSaving(false);
      window.location.assign("/onboarding-complete");
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
      case 2: return "License";
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
          <Stepper steps={isEditMode ? 5 : 2} currentStep={step} />
        </div>

        {/* Form Content based on Step */}
        {step === 1 && <PersonalInfoForm onNext={handleNext} />}
        {step === 2 && <LicensesStep onNext={isEditMode ? handleNext : handleFinish} isSaving={!isEditMode && isSaving} buttonLabel={isEditMode ? "Next" : "Finish"} />}
        {isEditMode && step === 3 && <RatingsStep onNext={handleNext} />}
        {isEditMode && step === 4 && <WorkStep onNext={handleNext} />}
        {isEditMode && step === 5 && <ResumeStep onNext={handleFinish} isSaving={isSaving} />}
      </div>
    </div>
  );
}
