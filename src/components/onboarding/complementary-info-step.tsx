"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkExperienceItem {
  id: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
}

interface ComplementaryInfoStepProps {
  onNext?: (data: { location: string; languages: string[]; workExperience: WorkExperienceItem[] }) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const COMMON_LOCATIONS = [
  "Miami, United States",
  "Dallas / Fort Worth, United States",
  "Atlanta, United States",
  "London, United Kingdom",
  "Dubai, United Arab Emirates",
  "Frankfurt, Germany",
  "Paris, France",
  "Madrid, Spain",
  "Singapore, Singapore",
  "Tokyo, Japan",
  "São Paulo, Brazil",
  "Bogotá, Colombia",
  "Mexico City, Mexico",
  "Buenos Aires, Argentina",
  "Sydney, Australia",
  "Doha, Qatar",
  "Amsterdam, Netherlands",
  "Toronto, Canada",
  "Other Location"
];

const SUGGESTED_LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Mandarin", "Arabic"];

export function ComplementaryInfoStep({ onNext, onBack, onSkip }: ComplementaryInfoStepProps) {
  const router = useRouter();

  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceItem[]>([
    { id: "exp-1", companyName: "", roleTitle: "", startDate: "", endDate: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.selectedCountry && !location) setLocation(parsed.selectedCountry);
        if (parsed.languages && Array.isArray(parsed.languages)) setLanguages(parsed.languages);
      }

      const savedWork = localStorage.getItem("onboarding_work");
      if (savedWork) {
        const parsedWork = JSON.parse(savedWork);
        if (Array.isArray(parsedWork) && parsedWork.length > 0) {
          setWorkExperiences(parsedWork);
        }
      }
    } catch (e) {
      console.error("Error reading saved complementary data:", e);
    }
  }, []);

  const handleAddLanguage = (lang: string) => {
    const trimmed = lang.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
      setLanguageInput("");
    }
  };

  const handleRemoveLanguage = (langToRemove: string) => {
    setLanguages(languages.filter(l => l !== langToRemove));
  };

  const handleAddExperience = () => {
    const newId = `exp-${Date.now()}`;
    setWorkExperiences([
      ...workExperiences,
      { id: newId, companyName: "", roleTitle: "", startDate: "", endDate: "" }
    ]);
  };

  const handleRemoveExperience = (idToRemove: string) => {
    if (workExperiences.length === 1) {
      setWorkExperiences([{ id: "exp-1", companyName: "", roleTitle: "", startDate: "", endDate: "" }]);
      return;
    }
    setWorkExperiences(workExperiences.filter(exp => exp.id !== idToRemove));
  };

  const handleExperienceChange = (id: string, field: keyof WorkExperienceItem, value: string) => {
    setWorkExperiences(prev =>
      prev.map(exp => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const handleSaveAndProceed = async (skip = false) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      if (!skip) {
        const validExperiences = workExperiences.filter(
          exp => exp.companyName.trim() || exp.roleTitle.trim()
        );

        const existing = localStorage.getItem("onboarding_personal");
        const parsed = existing ? JSON.parse(existing) : {};

        const updated = {
          ...parsed,
          location: location.trim(),
          languages,
          category: "aviation_professional",
          role: "aviation_professional"
        };

        localStorage.setItem("onboarding_personal", JSON.stringify(updated));
        localStorage.setItem("onboarding_work", JSON.stringify(validExperiences));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Update users table
          await supabase.from("users").upsert({
            id: session.user.id,
            location: location.trim() || null,
            accountType: "aviation_professional"
          }, { onConflict: "id" });

          // Update resumes table
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
              personal: updatedPersonal,
              work: validExperiences
            }
          }, { onConflict: "userId" });
        }
      }

      if (onNext) {
        onNext({
          location: location.trim(),
          languages,
          workExperience: workExperiences
        });
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving complementary information:", err);
      if (onNext) {
        onNext({ location: "", languages: [], workExperience: [] });
      }
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

        {/* 2. Title, 6-Segment Progress Bar (5 segments blue) & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Optional Details
          </h1>

          {/* 6-Segment Progress Bar: Segments 1, 2, 3, 4 & 5 blue, 6 gray */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-gray-200" />
          </div>

          <p className="text-sm text-gray-500">
            Enrich your profile with additional background details.
          </p>
        </div>

        {/* 3. Form Content (All Optional - No red asterisks) */}
        <div className="flex flex-col gap-6 flex-1">

          {/* Location (Optional Dropdown) */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="font-semibold text-gray-900 text-sm">
              Location
            </Label>
            <Select value={location || ""} onValueChange={(val) => setLocation(val || "")}>
              <SelectTrigger id="location" className="w-full rounded-2xl py-6 px-4 text-sm bg-white border border-gray-200 cursor-pointer">
                <SelectValue placeholder="Select City/Country" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {COMMON_LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc} className="py-2.5">
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Languages Spoken (Optional Multi-Select Tags) */}
          <div className="space-y-2">
            <Label htmlFor="languages" className="font-semibold text-gray-900 text-sm">
              Languages Spoken
            </Label>

            {/* Added Languages Chips */}
            {languages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 pb-1">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80 shadow-xs"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(lang)}
                      className="hover:text-blue-900 rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                id="languages"
                type="text"
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLanguage(languageInput);
                  }
                }}
                placeholder="e.g., English, Spanish, French"
                className="w-full rounded-2xl py-6 px-4 text-sm bg-white border border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              />
              <button
                type="button"
                onClick={() => handleAddLanguage(languageInput)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer shrink-0"
              >
                Add
              </button>
            </div>

            {/* Suggested Language Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-gray-400 self-center mr-1">Suggestions:</span>
              {SUGGESTED_LANGUAGES.filter(l => !languages.includes(l)).map(sugg => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => handleAddLanguage(sugg)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  + {sugg}
                </button>
              ))}
            </div>
          </div>

          {/* Repeatable Work Experience Group (AC 2) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-gray-900 text-sm">
                Work Experience
              </Label>
              <span className="text-xs text-gray-400 font-normal">Optional</span>
            </div>

            <div className="space-y-4">
              {workExperiences.map((exp, index) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl border border-gray-200/90 bg-gray-50/50 space-y-3.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Experience {index + 1}
                    </span>
                    {workExperiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(exp.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                        title="Remove experience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Company Name</Label>
                    <Input
                      type="text"
                      value={exp.companyName || ""}
                      onChange={(e) => handleExperienceChange(exp.id, "companyName", e.target.value)}
                      placeholder="e.g., Boeing, Lufthansa, Delta"
                      className="w-full rounded-xl py-5 px-3.5 text-sm bg-white border-gray-200 focus:border-[#1d4ed8]"
                    />
                  </div>

                  {/* Role / Job Title */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">Role / Job Title</Label>
                    <Input
                      type="text"
                      value={exp.roleTitle || ""}
                      onChange={(e) => handleExperienceChange(exp.id, "roleTitle", e.target.value)}
                      placeholder="e.g., Senior Aeronautical Engineer"
                      className="w-full rounded-xl py-5 px-3.5 text-sm bg-white border-gray-200 focus:border-[#1d4ed8]"
                    />
                  </div>

                  {/* Start Date & End Date in same row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
                      <Input
                        type="text"
                        value={exp.startDate || ""}
                        onChange={(e) => handleExperienceChange(exp.id, "startDate", e.target.value)}
                        placeholder="MM/YYYY"
                        className="w-full rounded-xl py-5 px-3.5 text-sm bg-white border-gray-200 focus:border-[#1d4ed8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-700">End Date</Label>
                      <Input
                        type="text"
                        value={exp.endDate || ""}
                        onChange={(e) => handleExperienceChange(exp.id, "endDate", e.target.value)}
                        placeholder="MM/YYYY or Present"
                        className="w-full rounded-xl py-5 px-3.5 text-sm bg-white border-gray-200 focus:border-[#1d4ed8]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* + Add another work experience button */}
            <button
              type="button"
              onClick={handleAddExperience}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1d4ed8] hover:text-[#1e40af] transition-colors py-1 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add another work experience
            </button>
          </div>

        </div>

        {/* 4. Bottom Buttons (Always Active Next + Skip Option - AC 3) */}
        <div className="pb-8 pt-6 space-y-3">
          <button
            type="button"
            onClick={() => handleSaveAndProceed(false)}
            disabled={isSaving}
            className="w-full py-4 rounded-full font-bold text-white transition-all shadow-md bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer"
          >
            {isSaving ? "Saving..." : "Next"}
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndProceed(true)}
            disabled={isSaving}
            className="w-full py-2.5 text-center text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            Skip this step
          </button>
        </div>

      </div>
    </div>
  );
}
