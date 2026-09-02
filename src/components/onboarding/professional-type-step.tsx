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
  const [customRole, setCustomRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("onboarding_personal");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.professionalRole) {
          setSelectedRole(parsed.professionalRole);
          if (parsed.professionalRole === "other") {
            setCustomRole(
              parsed.customRole ||
              parsed.otherRole ||
              parsed.specifiedRole ||
              (parsed.professionalTitle && parsed.professionalTitle !== "Other Aviation Professional" ? parsed.professionalTitle : "") ||
              ""
            );
          }
        } else if (parsed.role && ROLES.some(r => r.id === parsed.role)) {
          setSelectedRole(parsed.role);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    if (roleId !== "other") {
      setCustomRole("");
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/role-selection?edit=true&from=onboarding");
    }
  };

  const isFormValid = Boolean(
    selectedRole && (selectedRole !== "other" || customRole.trim().length > 0)
  );

  const handleNextClick = async () => {
    if (!isFormValid || isSaving || !selectedRole) return;

    setIsSaving(true);
    try {
      const selectedObj = ROLES.find(r => r.id === selectedRole);
      const roleLabel =
        selectedRole === "other" && customRole.trim()
          ? customRole.trim()
          : selectedObj
          ? selectedObj.label
          : "Aviation Professional";

      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};
      
      const updated = {
        ...parsed,
        category: "aviation_professional",
        role: selectedRole,
        professionalRole: roleLabel,
        professional_role: roleLabel,
        customRole: selectedRole === "other" ? customRole.trim() : "",
        otherRole: selectedRole === "other" ? customRole.trim() : "",
        specifiedRole: selectedRole === "other" ? customRole.trim() : "",
        professionalTitle: roleLabel,
        professionalRoleLabel: roleLabel
      };
      
      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Update public.users table with professionalRole, role, and accountType matching DB schema
        await Promise.allSettled([
          supabase.from("users").update({
            accountType: "flight_crew",
            role: selectedRole,
            professionalRole: "aviation_professional",
            professionalTitleKey: selectedRole,
            ...(selectedRole === "other" && customRole.trim() ? { professionalTitleOther: customRole.trim() } : {}),
          }).eq("id", session.user.id),

          // 2. Update auth user metadata (matching mobile payload format)
          supabase.auth.updateUser({
            data: {
              accountType: "aviation_professional",
              role: selectedRole,
              professionalRole: "aviation_professional",
              professional_role: "aviation_professional",
              category: "aviation_professional",
              professionalTitle: roleLabel,
              professionalRoleLabel: roleLabel,
            },
          }),
        ]);

        // 4. Update resume record with personal role info
        try {
          const { data: currentResume } = await supabase
            .from("resumes")
            .select("data")
            .eq("userId", session.user.id)
            .maybeSingle();

          const resumeData = (currentResume?.data as Record<string, unknown>) || {};
          const currentPersonal = (resumeData.personal as Record<string, unknown>) || {};
          await supabase.from("resumes").upsert({
            userId: session.user.id,
            data: {
              ...resumeData,
              personal: {
                ...currentPersonal,
                ...updated,
                role: selectedRole,
                professionalRole: roleLabel,
                professional_role: roleLabel,
                professionalTitle: roleLabel,
                professionalRoleLabel: roleLabel,
              },
            },
          }, { onConflict: "userId" });
        } catch (resumeErr) {
          console.error("Error updating resume role data:", resumeErr);
        }
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
            const isOtherRole = role.id === "other";

            return (
              <div key={role.id} className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
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

                {/* Dynamic input field when Other Aviation Professional is selected */}
                {isOtherRole && isSelected && (
                  <div className="mt-1 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                      type="text"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="Specify your professional role"
                      className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all shadow-xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            );
          })}
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
