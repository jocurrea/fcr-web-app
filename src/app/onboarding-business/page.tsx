"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/onboarding/stepper";
import { CompanyTypeStep } from "@/components/onboarding-business/company-type-step";
import { CompanyProfileStep } from "@/components/onboarding-business/company-profile-step";
import { CommunityVisibilityStep } from "@/components/onboarding-business/community-visibility-step";
import { ReviewFinishStep } from "@/components/onboarding-business/review-finish-step";
import { BusinessOnboardingProvider } from "@/components/onboarding-business/business-onboarding-context";

export default function OnboardingBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const handleNext = () => {
    window.scrollTo(0, 0);
    if (step < 4) {
      setStep(step + 1);
    } else {
      router.push("/home");
    }
  };

  const handleBack = () => {
    window.scrollTo(0, 0);
    if (step > 1) {
      setStep(step - 1);
    } else {
      // Step 1: go back to role selection
      router.push("/role-selection");
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1: return "Company Type";
      case 2: return "Company Profile";
      case 3: return "Community & Visibility";
      case 4: return "Review & Confirm";
      default: return "Onboarding";
    }
  };

  return (
    <BusinessOnboardingProvider>
      <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl min-h-[100dvh] flex flex-col px-4 sm:px-6">
        
        {/* Header */}
        <header className="flex items-center py-4 mt-2">
          <button
            onClick={handleBack}
            className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center text-[17px] font-bold pr-10 text-gray-900">
            {getTitle()}
          </h1>
        </header>

        {/* Stepper */}
        <div className="mt-2 mb-4 px-2">
          <Stepper steps={4} currentStep={step} />
        </div>

        {/* Form Content based on Step */}
        {step === 1 && <CompanyTypeStep onNext={handleNext} />}
        {step === 2 && <CompanyProfileStep onNext={handleNext} />}
        {step === 3 && <CommunityVisibilityStep onNext={handleNext} />}
        {step === 4 && <ReviewFinishStep onNext={handleNext} />}
      </div>
      </div>
    </BusinessOnboardingProvider>
  );
}
