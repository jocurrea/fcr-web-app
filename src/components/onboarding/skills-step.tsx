"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Plus, X, Search, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SkillItem {
  id: string;
  name: string;
}

interface SkillsStepProps {
  onNext?: (skills: SkillItem[]) => void;
  onBack?: () => void;
}

const PREDEFINED_SKILLS = [
  "Flight Operations",
  "Safety Management",
  "Compliance",
  "Crew Scheduling",
  "Avionics",
  "Aerodynamics",
  "Aircraft Maintenance",
  "CAD / Technical Design",
  "EASA / FAA Compliance",
  "Quality Assurance",
  "Turbine Engines",
  "Fleet Planning"
];

export function SkillsStep({ onNext, onBack }: SkillsStepProps) {
  const router = useRouter();

  const [selectedSkills, setSelectedSkills] = useState<SkillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.skills && Array.isArray(parsed.skills)) {
          // Normalize to SkillItem[] if stored as string[] or SkillItem[]
          const normalized: SkillItem[] = parsed.skills.map((s: any, idx: number) => {
            if (typeof s === "string") {
              return { id: `skill-${idx}-${Date.now()}`, name: s };
            }
            return s;
          });
          setSelectedSkills(normalized);
        }
      }
    } catch (e) {
      console.error("Error reading saved skills:", e);
    }
  }, []);

  const handleAddSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;

    const alreadyExists = selectedSkills.some(
      s => s.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (!alreadyExists) {
      const newSkill: SkillItem = {
        id: `skill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed
      };
      setSelectedSkills(prev => [...prev, newSkill]);
    }
    setSearchQuery("");
  };

  const handleRemoveSkill = (idToRemove: string) => {
    setSelectedSkills(prev => prev.filter(s => s.id !== idToRemove));
  };

  const filteredSuggestions = PREDEFINED_SKILLS.filter(sugg => {
    const matchesSearch = sugg.toLowerCase().includes(searchQuery.toLowerCase());
    const notAlreadySelected = !selectedSkills.some(
      s => s.name.toLowerCase() === sugg.toLowerCase()
    );
    return matchesSearch && notAlreadySelected;
  });

  const handleCompleteSetup = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};

      const updated = {
        ...parsed,
        skills: selectedSkills.map(s => s.name),
        structuredSkills: selectedSkills,
        category: "aviation_professional",
        role: "aviation_professional"
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));
      localStorage.setItem("onboarding_skills", JSON.stringify(selectedSkills));

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
          ...updated
        };

        await supabase.from("resumes").upsert({
          userId: session.user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal
          }
        }, { onConflict: "userId" });

        // Update users table onboarded status
        await supabase.from("users").upsert({
          id: session.user.id,
          onboarded: 1,
          accountType: "aviation_professional"
        }, { onConflict: "id" });

        await supabase.auth.updateUser({
          data: {
            onboarded: true,
            accountType: "aviation_professional",
            crew_data_saved: true
          }
        });
      }

      if (onNext) {
        onNext(selectedSkills);
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving skills and completing setup:", err);
      if (onNext) {
        onNext(selectedSkills);
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

          <p className="text-sm text-gray-500">
            Select your technical skills and engineering competencies.
          </p>
        </div>

        {/* 3. Skills Selection Component (AC 1, AC 2 & AC 3) */}
        <div className="flex flex-col gap-4 flex-1">
          
          {/* Search / Add Input */}
          <div className="space-y-1.5">
            <Label htmlFor="skillSearch" className="font-semibold text-gray-900 text-sm">
              Skills
            </Label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="skillSearch"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(searchQuery);
                    }
                  }}
                  placeholder="Search or add skills (e.g., Flight Operations)..."
                  className="w-full rounded-2xl py-6 pl-11 pr-4 text-sm bg-white border border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                />
              </div>

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleAddSkill(searchQuery)}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer shrink-0"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Selected Skills (Pill Tags - AC 2) */}
          {selectedSkills.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Selected Skills ({selectedSkills.length})
              </span>
              <div className="flex flex-wrap gap-2 pt-1 pb-1">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold border border-blue-200 shadow-xs animate-in fade-in zoom-in-95 duration-150"
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="hover:text-blue-950 p-0.5 rounded-full hover:bg-blue-100/80 transition-colors cursor-pointer"
                      title={`Remove ${skill.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Skills (Mock Data - AC 1) */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Suggested Competencies
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {filteredSuggestions.map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => handleAddSkill(sugg)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-xs font-medium border border-gray-200/60 hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                  {sugg}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 4. Bottom Button ("Complete Setup" / "Finish") */}
        <div className="pb-8 pt-6">
          <button
            type="button"
            onClick={handleCompleteSetup}
            disabled={isSaving}
            className="w-full py-4 rounded-full font-bold text-white transition-all shadow-md bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer"
          >
            {isSaving ? "Finalizing setup..." : "Complete Setup"}
          </button>
        </div>

      </div>
    </div>
  );
}
