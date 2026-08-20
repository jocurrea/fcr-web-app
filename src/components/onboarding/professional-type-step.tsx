"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Check, Wrench, Settings, MoreHorizontal, Radio, IdCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ProfessionalTypeStepProps {
  onNext?: (selectedRole: string) => void;
  onBack?: () => void;
}

const ROLES = [
  {
    id: "operations_officer",
    label: "Operations Officer",
    icon: <IdCard className="w-6 h-6 text-gray-500" />
  },
  {
    id: "aircraft_mechanic",
    label: "Aircraft Mechanic",
    icon: <Wrench className="w-6 h-6 text-gray-500" />
  },
  {
    id: "air_traffic_controller",
    label: "Air Traffic Controller",
    icon: <Radio className="w-6 h-6 text-gray-500" />
  },
  {
    id: "aeronautical_engineer",
    label: "Aeronautical Engineer",
    icon: <Settings className="w-6 h-6 text-gray-500" />
  },
  {
    id: "other",
    label: "Other Aviation Professional",
    icon: <MoreHorizontal className="w-6 h-6 text-gray-500" />
  }
];

export function ProfessionalTypeStep({ onNext, onBack }: ProfessionalTypeStepProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("onboarding_personal");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.professionalRole) {
          setSelectedRole(parsed.professionalRole);
        } else if (parsed.role && ROLES.some(r => r.id === parsed.role)) {
          setSelectedRole(parsed.role);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/role-selection?edit=true&from=onboarding");
    }
  };

  const handleNextClick = async () => {
    if (!selectedRole || isSaving) return;

    setIsSaving(true);
    try {
      const selectedObj = ROLES.find(r => r.id === selectedRole);
      const roleLabel = selectedObj ? selectedObj.label : "Aviation Professional";

      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};
      
      const updated = {
        ...parsed,
        category: "aviation_professional",
        role: "aviation_professional",
        professionalRole: selectedRole,
        professionalTitle: roleLabel,
        professionalRoleLabel: roleLabel
      };
      
      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("users").upsert({
          id: session.user.id,
          accountType: "aviation_professional"
        }, { onConflict: "id" });
      }

      if (onNext) {
        onNext(selectedRole);
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving professional role:", err);
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
            onClick={handleBackClick}
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

        {/* 2. Title, 6-Segment Progress Bar & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Professional Type
          </h1>

          {/* 6-Segment Progress Bar (1st solid blue, 5 light gray) */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
          </div>

          <p className="text-sm text-gray-500">
            Select your professional role
          </p>
        </div>

        {/* 3. Options List (Cards) */}
        <div className="flex flex-col gap-3.5 flex-1">
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`flex items-center p-4 sm:p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
                  isSelected 
                    ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                    : "border-gray-100 hover:border-gray-200 bg-white shadow-xs"
                }`}
              >
                {/* Gray Icon on Left */}
                <div className="shrink-0 mr-4 flex items-center justify-center">
                  {role.icon}
                </div>

                {/* Role Text */}
                <div className="flex-1 min-w-0 pr-2">
                  <h2 className="text-[17px] font-semibold text-gray-900">
                    {role.label}
                  </h2>
                </div>

                {/* Square Checkbox on Right */}
                <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
                  isSelected 
                    ? "bg-[#1d4ed8] text-white shadow-xs" 
                    : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
                }`}>
                  {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* 4. Bottom Next Button */}
        <div className="pb-8 pt-4">
          <button
            type="button"
            onClick={handleNextClick}
            disabled={!selectedRole || isSaving}
            className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
              selectedRole && !isSaving
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
