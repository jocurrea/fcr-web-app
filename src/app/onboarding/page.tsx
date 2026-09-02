"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";

// Flight Crew Steps
import { PersonalInfoForm } from "@/components/onboarding/personal-info-form";
import { LicensesStep } from "@/components/onboarding/licenses-step";
import { RatingsStep } from "@/components/onboarding/ratings-step";
import { WorkStep } from "@/components/onboarding/work-step";
import { ResumeStep } from "@/components/onboarding/resume-step";
import { Stepper } from "@/components/onboarding/stepper";

// Aviation Professional Steps
import { ProfessionalTypeStep } from "@/components/onboarding/professional-type-step";
import { PersonalIdentificationStep } from "@/components/onboarding/personal-identification-step";
import { ProfessionalSummaryStep } from "@/components/onboarding/professional-summary-step";
import { ContactCredentialsStep } from "@/components/onboarding/contact-credentials-step";
import { ComplementaryInfoStep } from "@/components/onboarding/complementary-info-step";
import { SkillsStep } from "@/components/onboarding/skills-step";
import { AvailabilityStep } from "@/components/onboarding/availability-step";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<"flight_crew" | "aviation_professional">("flight_crew");
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initializeOnboarding() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const editMode = urlParams.get("edit") === "true";
        setIsEditMode(editMode);

        const urlStep = urlParams.get("step");
        if (urlStep) {
          const parsedStep = parseInt(urlStep, 10);
          if (!isNaN(parsedStep) && parsedStep >= 1) {
            setStep(parsedStep);
          }
        }
        
        // Fetch User and Resume records from database
        const [{ data: userRecord }, { data: resumeRecord }] = await Promise.all([
          supabase
            .from("users")
            .select("id, onboarded, accountType, firstName, lastName, profileImage, email, phone, location, availability_status")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("resumes")
            .select("data")
            .eq("userId", session.user.id)
            .maybeSingle(),
        ]);

        const onboarded = !!userRecord?.onboarded;
        const accountType = userRecord?.accountType || "";

        const metaAccountType = session.user.user_metadata?.accountType;
        const savedPersonalRaw = localStorage.getItem("onboarding_personal");
        const localPersonal = savedPersonalRaw ? JSON.parse(savedPersonalRaw) : {};
        const localCat = localPersonal.category || localPersonal.role;

        let currentCategory: "flight_crew" | "aviation_professional" = "flight_crew";
        const urlCat = urlParams.get("category");
        if (urlCat === "flight_crew" || urlCat === "aviation_professional") {
          currentCategory = urlCat;
        } else if (metaAccountType === "aviation_professional" || localCat === "aviation_professional") {
          currentCategory = "aviation_professional";
        } else if (accountType === "flight_crew" || accountType === "aviation_professional") {
          currentCategory = accountType;
        }

        // If completed and not editing, go to home
        if (onboarded && !editMode) {
          router.replace("/home");
          return;
        }

        // Pre-populate localStorage for all steps
        const crewData = (resumeRecord?.data as any) || {};

        const mergedPersonal = {
          ...(crewData.personal || {}),
          ...localPersonal,
          category: currentCategory,
          firstName: localPersonal.firstName || crewData.personal?.firstName || userRecord?.firstName || "",
          lastName: localPersonal.lastName || crewData.personal?.lastName || userRecord?.lastName || "",
          email: localPersonal.email || crewData.personal?.email || userRecord?.email || session.user.email || "",
          phone: localPersonal.phone || crewData.personal?.phone || userRecord?.phone || "",
          location: localPersonal.location || crewData.personal?.location || userRecord?.location || "",
          availabilityStatus:
            localPersonal.availabilityStatus ||
            crewData.personal?.availabilityStatus ||
            userRecord?.availability_status ||
            "active",
        };

        localStorage.setItem("onboarding_personal", JSON.stringify(mergedPersonal));

        const photo =
          userRecord?.profileImage ||
          crewData.personal?.profileImage ||
          localStorage.getItem("userProfilePhoto");
        if (photo) {
          localStorage.setItem("userProfilePhoto", photo);
        }

        if (crewData.licenses) localStorage.setItem("onboarding_licenses", JSON.stringify(crewData.licenses));
        if (crewData.ratings) localStorage.setItem("onboarding_ratings", JSON.stringify(crewData.ratings));
        if (crewData.work) localStorage.setItem("onboarding_work", JSON.stringify(crewData.work));
        if (crewData.resume) localStorage.setItem("onboarding_resume", JSON.stringify(crewData.resume));

        if (isMounted) {
          setCategory(currentCategory);
          setIsCheckingAccess(false);
        }
      } catch (e) {
        console.error("[Onboarding] Error initializing:", e);
        if (isMounted) setIsCheckingAccess(false);
      }
    }

    initializeOnboarding();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const totalStepsFlightCrew = isEditMode ? 5 : 2;

  const handleNext = () => {
    if (category === "flight_crew") {
      if (step < totalStepsFlightCrew) {
        setStep(step + 1);
      }
    } else {
      // For aviation_professional, we handle next inside the components, but a generic handleNext can increment it
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      if (isEditMode) {
        router.push("/profile");
      } else {
        router.push("/role-selection?edit=true&from=onboarding");
      }
    }
  };

  const getFlightCrewTitle = () => {
    switch (step) {
      case 1: return "Personal";
      case 2: return "License";
      case 3: return "Ratings";
      case 4: return "Work";
      case 5: return "Resume";
      default: return "Onboarding";
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

      const personalData = personalRaw ? JSON.parse(personalRaw) : {};

      const crewData = {
        personal: personalData,
        licenses: licensesRaw ? JSON.parse(licensesRaw) : [],
        ratings: ratingsRaw ? JSON.parse(ratingsRaw) : [],
        work: workRaw ? JSON.parse(workRaw) : personalData.workExperiences || [],
        resume: resumeRaw ? JSON.parse(resumeRaw) : {},
      };

      // Fetch existing user to avoid overwriting previously selected roles with null
      const { data: existingUser } = await supabase
        .from("users")
        .select("role, professionalRole, accountType, professionalTitleKey")
        .eq("id", session.user.id)
        .maybeSingle();

      const isAviationPro =
        category === "aviation_professional" ||
        personalData?.category === "aviation_professional" ||
        personalData?.role === "aviation_professional" ||
        existingUser?.professionalRole === "aviation_professional";

      const isCrew =
        personalData?.role === "crew" ||
        personalData?.role === "cabin_crew" ||
        existingUser?.professionalRole === "crew" ||
        existingUser?.role === "crew";

      // Must strictly match users_professional_role_check: 'pilot' | 'crew' | 'aviation_professional'
      const validProfessionalRole = isAviationPro
        ? "aviation_professional"
        : isCrew
        ? "crew"
        : (existingUser?.professionalRole || "pilot");

      const validRole =
        personalData?.role ||
        existingUser?.role ||
        (isAviationPro ? "aviation_professional" : isCrew ? "crew" : "pilot");

      // Must strictly match users_account_type_check: 'flight_crew' | 'business'
      const validAccountType: "flight_crew" | "business" = "flight_crew";

      const humanRoleLabel =
        personalData?.professionalRoleLabel ||
        personalData?.professionalTitle ||
        (isAviationPro
          ? "Aviation Professional"
          : isCrew
          ? "Cabin Crew"
          : "Pilot");

      // 1. Update DB records in parallel
      await Promise.allSettled([
        supabase.from("resumes").upsert(
          {
            userId: session.user.id,
            data: crewData,
          },
          { onConflict: "userId" }
        ),

        supabase.from("users").upsert(
          {
            id: session.user.id,
            firstName: personalData?.firstName || "Unknown",
            lastName: personalData?.lastName || "",
            ...(avatarPhoto ? { profileImage: avatarPhoto } : {}),
            email: personalData?.email || session.user.email,
            phone: personalData?.phone || null,
            location: personalData?.location || null,
            availability_status: personalData?.availabilityStatus || "active",
            onboarded: 1,
            accountType: validAccountType,
            role: validRole,
            professionalRole: validProfessionalRole,
            ...(isAviationPro ? { professionalTitleKey: validRole } : {}),
          },
          { onConflict: "id" }
        ),
      ]);

      // 2. Mandatory JWT update: update auth user metadata with onboarded: true and role
      try {
        await supabase.auth.updateUser({
          data: {
            onboarded: true,
            accountType: category,
            category: category,
            role: validRole,
            professionalRole: validProfessionalRole,
            professional_role: validProfessionalRole,
            professionalRoleLabel: humanRoleLabel,
            professionalTitle: humanRoleLabel,
            crew_data_saved: true,
          },
        });
      } catch (authErr) {
        console.warn("[Onboarding] Auth metadata update warning:", authErr);
      }

      // 3. Immediately refresh session so new JWT is issued and persisted to cookies
      try {
        await supabase.auth.refreshSession();
      } catch (refErr) {
        console.warn("[Onboarding] Refresh session error:", refErr);
      }
    } catch (err: any) {
      console.error("[Onboarding] Sync error:", err);
    } finally {
      // 4. Overwrite cookies and storage immediately before navigation
      try {
        document.cookie = "flightcrew_onboarded=true; path=/; max-age=31536000; SameSite=Lax";
        sessionStorage.setItem("flightcrew_onboarded", "true");
        localStorage.setItem("flightcrew_onboarded", "true");
      } catch (e) {
        console.error("Storage error:", e);
      }

      setIsSaving(false);

      if (isEditMode) {
        router.refresh();
        router.push("/profile");
      } else {
        // 5. Invalidate Next.js server cache and navigate to /home
        router.refresh();
        router.push("/home");

        // Fallback for full page refresh if client transition is delayed
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.pathname !== "/home") {
            window.location.replace("/home");
          }
        }, 400);
      }
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ============================================
  // FLIGHT CREW WIZARD FLOW (Pilots & Cabin Crew)
  // ============================================
  if (category === "flight_crew") {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-xl h-screen flex flex-col px-4 sm:px-6">
          {/* Header */}
          <header className="flex items-center py-4 mt-2">
            <button
              onClick={handleBack}
              className="p-2 border rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="flex-1 text-center text-xl font-bold pr-10">
              {getFlightCrewTitle()}
            </h1>
          </header>

          {/* Stepper */}
          <div className="mt-2 mb-4 px-2">
            <Stepper steps={totalStepsFlightCrew} currentStep={step} />
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

  // ============================================
  // AVIATION PROFESSIONAL WIZARD FLOW (6 Steps)
  // ============================================
  if (step === 1) {
    return <ProfessionalTypeStep onBack={handleBack} onNext={() => setStep(2)} />;
  }

  if (step === 2) {
    return <PersonalIdentificationStep onBack={handleBack} onNext={() => setStep(3)} />;
  }

  if (step === 3) {
    return <ProfessionalSummaryStep onBack={handleBack} onNext={() => setStep(4)} />;
  }

  if (step === 4) {
    return <ContactCredentialsStep onBack={handleBack} onNext={() => setStep(5)} />;
  }

  if (step === 5) {
    return <ComplementaryInfoStep onBack={handleBack} onNext={() => setStep(6)} onSkip={() => setStep(6)} />;
  }

  if (step === 6) {
    return <SkillsStep onBack={handleBack} onNext={() => setStep(7)} />;
  }

  if (step === 7) {
    return <AvailabilityStep onBack={handleBack} onNext={handleFinish} />;
  }

  return null;
}
