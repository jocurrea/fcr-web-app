"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Search, Plus, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SkillItem {
  id: string;
  name: string;
}

interface SkillsStepProps {
  onNext?: (skills: SkillItem[]) => void;
  onBack?: () => void;
}

const AVIATION_SKILLS = [
  "Flight Operations",
  "Safety Management",
  "Compliance",
  "Crew Scheduling",
  "Avionics",
  "Aerodynamics",
  "Aircraft Maintenance",
  "CAD / Technical Design",
  "EASA / FAA Regulations",
  "Quality Assurance",
  "Turbine Engines",
  "Fleet Planning",
  "Navigation Systems",
  "Ground Handling",
  "Air Traffic Control",
  "Fuel Management",
  "Aviation Security",
  "Flight Dispatch",
  "Meteorology",
  "Risk Assessment"
];

const MAX_SKILLS = 20;

export function SkillsStep({ onNext, onBack }: SkillsStepProps) {
  const router = useRouter();

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.skills && Array.isArray(parsed.skills)) {
          const list = parsed.skills.map((s: any) => (typeof s === "string" ? s : s.name));
          setSelectedSkills(list);
        }
      }
    } catch (e) {
      console.error("Error reading saved skills:", e);
    }
  }, []);

  const toggleSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;

    if (selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => prev.filter(s => s !== trimmed));
    } else {
      if (selectedSkills.length < MAX_SKILLS) {
        setSelectedSkills(prev => [...prev, trimmed]);
      }
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = searchQuery.trim();
    if (trimmed && !selectedSkills.includes(trimmed) && selectedSkills.length < MAX_SKILLS) {
      setSelectedSkills(prev => [...prev, trimmed]);
      setSearchQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomSkill();
    }
  };

  const filteredSkills = AVIATION_SKILLS.filter(skill =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine custom added skills with predefined ones for display
  const allDisplaySkills = Array.from(new Set([...selectedSkills, ...filteredSkills]));

  const handleContinue = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};

      const skillItems: SkillItem[] = selectedSkills.map((name, idx) => ({
        id: `skill-${idx + 1}-${Date.now()}`,
        name,
      }));

      const updated = {
        ...parsed,
        skills: selectedSkills,
        structuredSkills: skillItems,
        category: "aviation_professional",
        role: "aviation_professional",
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));
      localStorage.setItem("onboarding_skills", JSON.stringify(skillItems));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Save into resumes table
        const { data: currentResume } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", session.user.id)
          .maybeSingle();

        const resumeData = (currentResume?.data as any) || {};
        const updatedPersonal = {
          ...(resumeData.personal || {}),
          ...updated,
        };

        await supabase.from("resumes").upsert({
          userId: session.user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal,
            skills: selectedSkills,
          },
        }, { onConflict: "userId" });
      }

      if (onNext) {
        onNext(skillItems);
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving skills:", err);
      if (onNext) {
        onNext([]);
      }
    } finally {
      setIsSaving(false);
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
            Skills & Expertise
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
            Select your skills
          </h2>

          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Choose the aviation and technical skills that best describe your expertise.
          </p>
        </div>

        {/* 3. Skills Selection Component */}
        <div className="flex flex-col gap-5 flex-1">
          
          {/* Rounded Search Input with Magnifying Glass */}
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search skills"
                className="w-full rounded-2xl py-6 pl-11 pr-14 text-sm bg-white border border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
              />

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="absolute right-2 px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Skills & Expertise Header + Counter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-sm font-extrabold text-gray-900">
                Skills & Expertise
              </span>
              <span className="text-xs font-medium text-gray-400">
                {selectedSkills.length} / {MAX_SKILLS}
              </span>
            </div>

            {/* Selectable Skill Pills Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {allDisplaySkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill);

                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 shadow-2xs",
                      isSelected
                        ? "bg-blue-50 border-[#1d4ed8] text-[#1d4ed8] font-bold ring-1 ring-[#1d4ed8]/30"
                        : "bg-white border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* 4. Bottom Button: Continue */}
        <div className="pb-8 pt-6">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSaving}
            className="w-full py-4 rounded-full font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all shadow-md cursor-pointer text-center text-sm"
          >
            {isSaving ? "Please wait..." : "Continue"}
          </button>
        </div>

      </div>
    </div>
  );
}
