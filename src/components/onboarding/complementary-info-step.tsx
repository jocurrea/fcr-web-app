"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Briefcase,
  Search,
  Check,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface WorkExperienceItem {
  id: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
}

interface ComplementaryInfoStepProps {
  onNext?: (data: { location: string; city: string; country: string; languages: string[]; workExperience: WorkExperienceItem[] }) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

interface CountryOption {
  code: string;
  name: string;
  flag?: string;
}

// Crisp cross-platform flag component that renders graphical flags reliably on Windows, Mac, iOS, Android
function CountryFlagIcon({ code, className = "" }: { code: string; className?: string }) {
  if (!code || code === "OTHER" || code === "CUSTOM") {
    return (
      <span className={cn("w-6 h-4 inline-flex items-center justify-center text-sm shrink-0", className)}>
        🌐
      </span>
    );
  }

  const iso = code.toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 overflow-hidden rounded-xs border border-gray-200/90 shadow-2xs w-[22px] h-[15px] bg-gray-100",
        className
      )}
    >
      <img
        src={`https://flagcdn.com/w40/${iso}.png`}
        alt={`${code} flag`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </span>
  );
}

const COUNTRIES_WITH_FLAGS: CountryOption[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "QA", name: "Qatar" },
  { code: "SG", name: "Singapore" },
  { code: "BR", name: "Brazil" },
  { code: "CO", name: "Colombia" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "PA", name: "Panama" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "CH", name: "Switzerland" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "IN", name: "India" },
  { code: "ZA", name: "South Africa" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "TR", name: "Turkey" },
  { code: "GR", name: "Greece" },
  { code: "PL", name: "Poland" },
  { code: "PE", name: "Peru" },
  { code: "EC", name: "Ecuador" },
  { code: "CR", name: "Costa Rica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "OTHER", name: "Other Country" },
];

const ALL_LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "Arabic",
  "Mandarin Chinese",
  "German",
  "Portuguese",
  "Russian",
  "Japanese",
  "Italian",
  "Korean",
  "Turkish",
  "Dutch",
  "Swedish",
  "Polish",
  "Tagalog",
  "Vietnamese",
  "Indonesian",
  "Greek",
  "Hebrew",
  "Thai",
  "Czech",
  "Danish",
  "Finnish",
  "Norwegian",
  "Hungarian",
  "Romanian"
];

const MAX_LANGUAGES = 20;

// English Calendar Component rendered via React Portal in document.body
interface EnglishDatePickerProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ENGLISH_DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function EnglishDatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
}: EnglishDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse initial date or default to current date
  const parsedDate = value && value !== "Present" ? new Date(value) : null;
  const initialYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : new Date().getFullYear();
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() : new Date().getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  useEffect(() => {
    if (value && value !== "Present") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, "0");
    const formattedDay = String(today.getDate()).padStart(2, "0");
    const dateStr = `${today.getFullYear()}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Format display in English (e.g. "Aug 15, 2024")
  const formatDisplay = (val: string) => {
    if (!val) return "";
    if (val === "Present") return "Present";
    const parts = val.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (m >= 0 && m < 12) {
        return `${ENGLISH_MONTHS[m].slice(0, 3)} ${d}, ${y}`;
      }
    }
    return val;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!value || value === "Present") return false;
    const parts = value.split("-");
    if (parts.length === 3) {
      return (
        parseInt(parts[0], 10) === currentYear &&
        parseInt(parts[1], 10) - 1 === currentMonth &&
        parseInt(parts[2], 10) === day
      );
    }
    return false;
  };

  if (disabled) {
    return (
      <div className="w-full rounded-2xl py-3.5 px-4 text-sm border bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200 font-medium flex items-center justify-between">
        <span>{value || placeholder}</span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Input Trigger keeping exact same Tailwind classes */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full rounded-2xl py-3.5 px-4 text-sm bg-white border transition-all flex items-center justify-between cursor-pointer text-left shadow-2xs",
          isOpen
            ? "border-[#1d4ed8] ring-2 ring-[#1d4ed8]/20"
            : "border-gray-200 hover:border-gray-300 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
        )}
      >
        <span className={value ? "font-medium text-gray-900" : "text-gray-400"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </button>

      {/* English Calendar Modal Overlay rendered via React Portal in document.body */}
      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 border border-gray-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Month / Year and Prev / Next Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-extrabold text-gray-900 text-base">
                {ENGLISH_MONTHS[currentMonth]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>

            {/* Weekday Headers (English: Su, Mo, Tu, We, Th, Fr, Sa) */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {ENGLISH_DAY_HEADERS.map((day) => (
                <span key={day} className="text-xs font-bold text-gray-400 py-1">
                  {day}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {/* Empty slots before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="w-9 h-9" />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const selected = isSelected(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "w-9 h-9 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer",
                      selected
                        ? "bg-[#1d4ed8] text-white font-bold shadow-xs"
                        : today
                        ? "bg-blue-50 text-[#1d4ed8] font-bold border border-blue-200"
                        : "text-gray-800 hover:bg-gray-100"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer Bar: Clear, Cancel & Today (Strictly English) */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold">
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-500 hover:text-gray-800 py-2 px-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Clear
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 py-2 px-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-white bg-[#1d4ed8] hover:bg-[#1e40af] py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function ComplementaryInfoStep({ onNext, onBack, onSkip }: ComplementaryInfoStepProps) {
  const router = useRouter();

  const [city, setCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const [languages, setLanguages] = useState<string[]>([]);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");

  // Work Experience state
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceItem[]>([]);
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [expCompanyName, setExpCompanyName] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expStartDate, setExpStartDate] = useState("");
  const [expEndDate, setExpEndDate] = useState("");
  const [expCurrentlyWorking, setExpCurrentlyWorking] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Close country dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    try {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        if (parsed.city) setCity(parsed.city);
        if (parsed.selectedCountry) {
          const match = COUNTRIES_WITH_FLAGS.find(
            c => c.name.toLowerCase() === parsed.selectedCountry.toLowerCase() || c.code.toLowerCase() === parsed.selectedCountry.toLowerCase()
          );
          if (match) {
            setSelectedCountry(match);
          } else {
            setSelectedCountry({ code: "CUSTOM", name: parsed.selectedCountry });
          }
        } else if (parsed.location && !parsed.city) {
          const parts = parsed.location.split(",").map((s: string) => s.trim());
          if (parts[0]) setCity(parts[0]);
          if (parts[1]) {
            const match = COUNTRIES_WITH_FLAGS.find(
              c => c.name.toLowerCase() === parts[1].toLowerCase()
            );
            if (match) setSelectedCountry(match);
          }
        }
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

  const handleSelectCountry = (country: CountryOption) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
  };

  const handleToggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(prev => prev.filter(l => l !== lang));
    } else {
      if (languages.length < MAX_LANGUAGES) {
        setLanguages(prev => [...prev, lang]);
      }
    }
  };

  const handleRemoveLanguage = (langToRemove: string) => {
    setLanguages(prev => prev.filter(l => l !== langToRemove));
  };

  // Experience Modal Handlers
  const handleOpenExperienceModal = () => {
    setExpCompanyName("");
    setExpRole("");
    setExpStartDate("");
    setExpEndDate("");
    setExpCurrentlyWorking(false);
    setIsExperienceModalOpen(true);
  };

  const handleCloseExperienceModal = () => {
    setIsExperienceModalOpen(false);
    setExpCompanyName("");
    setExpRole("");
    setExpStartDate("");
    setExpEndDate("");
    setExpCurrentlyWorking(false);
  };

  const handleSaveExperience = () => {
    if (!expCompanyName.trim() && !expRole.trim()) {
      handleCloseExperienceModal();
      return;
    }
    const item: WorkExperienceItem = {
      id: `exp-${Date.now()}`,
      companyName: expCompanyName.trim(),
      roleTitle: expRole.trim(),
      startDate: expStartDate.trim(),
      endDate: expCurrentlyWorking ? "Present" : (expEndDate.trim() || "Present"),
    };
    setWorkExperiences(prev => [...prev, item]);
    handleCloseExperienceModal();
  };

  const handleRemoveExperience = (idToRemove: string) => {
    setWorkExperiences(prev => prev.filter(exp => exp.id !== idToRemove));
  };

  const handleSaveAndProceed = async (skip = false) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      if (!skip) {
        const countryName = selectedCountry?.name || "";
        const combinedLocation = [city.trim(), countryName.trim()].filter(Boolean).join(", ");
        const validExperiences = workExperiences.filter(
          exp => exp.companyName.trim() || exp.roleTitle.trim()
        );

        const existing = localStorage.getItem("onboarding_personal");
        const parsed = existing ? JSON.parse(existing) : {};

        const updated = {
          ...parsed,
          city: city.trim(),
          selectedCountry: countryName.trim(),
          country: countryName.trim(),
          location: combinedLocation,
          languages,
          workExperiences: validExperiences,
          category: "aviation_professional",
          role: "aviation_professional",
        };

        localStorage.setItem("onboarding_personal", JSON.stringify(updated));
        localStorage.setItem("onboarding_work", JSON.stringify(validExperiences));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Update users table
          await supabase.from("users").upsert({
            id: session.user.id,
            location: combinedLocation || null,
            accountType: "aviation_professional",
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
            ...updated,
          };

          await supabase.from("resumes").upsert({
            userId: session.user.id,
            data: {
              ...resumeData,
              personal: updatedPersonal,
              work: validExperiences,
            },
          }, { onConflict: "userId" });
        }
      }

      if (onNext) {
        onNext({
          location: [city.trim(), selectedCountry?.name || ""].filter(Boolean).join(", "),
          city: city.trim(),
          country: selectedCountry?.name || "",
          languages,
          workExperience: workExperiences,
        });
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving optional details:", err);
      if (onNext) {
        onNext({ location: "", city: "", country: "", languages: [], workExperience: [] });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCountries = COUNTRIES_WITH_FLAGS.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredLanguages = ALL_LANGUAGES.filter(lang =>
    lang.toLowerCase().includes(languageSearch.toLowerCase())
  );

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

        {/* 2. Title, 6-Segment Progress Bar (5 segments blue), Subtitle & Description */}
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

          <h2 className="text-base font-bold text-gray-900 mt-1">
            Complementary information
          </h2>

          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            These details are optional. Add them now or come back from Edit Profile.
          </p>
        </div>

        {/* 3. Form Content */}
        <div className="flex flex-col gap-6 flex-1">

          {/* 1. Location: Stacked Inputs (City top, Custom Country Select bottom with flags) */}
          <div className="space-y-2">
            <Label className="font-semibold text-gray-900 text-sm">
              Location
            </Label>
            
            <div className="flex flex-col gap-2.5">
              {/* City Input */}
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-2xl py-6 px-4 text-sm bg-white border border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
              />

              {/* Custom Country Select with Flag Icons */}
              <div className="relative" ref={countryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="w-full rounded-2xl py-3.5 px-4 text-sm bg-white border border-gray-200 hover:border-gray-300 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all flex items-center justify-between cursor-pointer text-left shadow-2xs"
                >
                  {selectedCountry ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <CountryFlagIcon code={selectedCountry.code} />
                      <span className="font-medium text-gray-900 truncate">
                        {selectedCountry.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Select Country</span>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isCountryDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu */}
                {isCountryDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl z-40 overflow-hidden animate-in fade-in duration-150">
                    {/* Search inside country dropdown */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country..."
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[#1d4ed8]"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Country Items List with Graphical Flags */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelectCountry(c)}
                          className={cn(
                            "w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-blue-50/70 transition-colors cursor-pointer text-xs sm:text-sm",
                            selectedCountry?.code === c.code ? "bg-blue-50/80 font-bold" : "text-gray-800"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CountryFlagIcon code={c.code} />
                            <span className={cn(selectedCountry?.code === c.code ? "text-[#1d4ed8]" : "text-gray-900", "truncate")}>
                              {c.name}
                            </span>
                          </div>
                          {selectedCountry?.code === c.code && (
                            <Check className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                          )}
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-400">
                          No matching country found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Languages: 0 / 20 aligned right + Trigger Button launching Floating Modal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <Label className="font-semibold text-gray-900 text-sm">
                Languages
              </Label>
              <span className="text-xs font-medium text-gray-400">
                {languages.length} / {MAX_LANGUAGES}
              </span>
            </div>

            {/* Modal Trigger Input Button */}
            <button
              type="button"
              onClick={() => {
                setIsLanguageModalOpen(true);
                setLanguageSearch("");
              }}
              className="w-full rounded-2xl py-3.5 px-4 text-sm bg-white border border-gray-200 hover:border-[#1d4ed8] focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all flex items-center justify-between cursor-pointer text-left shadow-2xs"
            >
              <span className="text-gray-400">Add a language</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Language Chips */}
            {languages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#1d4ed8] text-xs font-bold shadow-2xs"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(lang)}
                      className="w-4 h-4 rounded-full hover:bg-blue-200/70 text-blue-500 hover:text-blue-800 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. Work experience: Label left + small outline button "+ Add" launching Modal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <Label className="font-semibold text-gray-900 text-sm">
                Work experience
              </Label>
              <button
                type="button"
                onClick={handleOpenExperienceModal}
                className="px-3.5 py-1 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50/60 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </div>

            {/* List of added work experiences */}
            {workExperiences.length > 0 && (
              <div className="space-y-2">
                {workExperiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-[#1d4ed8] shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {exp.roleTitle || "Aviation Role"}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {exp.companyName} {exp.startDate ? `(${exp.startDate} - ${exp.endDate || "Present"})` : ""}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(exp.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer"
                      title="Remove experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 4. Bottom Buttons: Skip (outline) & Continue (solid blue) */}
        <div className="pb-8 pt-6 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => handleSaveAndProceed(true)}
            disabled={isSaving}
            className="flex-1 py-4 rounded-full font-bold border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 transition-all shadow-xs cursor-pointer text-center text-sm"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndProceed(false)}
            disabled={isSaving}
            className="flex-1 py-4 rounded-full font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all shadow-md cursor-pointer text-center text-sm"
          >
            {isSaving ? "Please wait..." : "Continue"}
          </button>
        </div>

      </div>

      {/* Floating Language Selection Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-gray-100 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Header: Left Bold Title + Right Close (X) */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">
                Select a language
              </h3>
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input with Magnifying Glass */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
              <Input
                type="text"
                value={languageSearch}
                onChange={(e) => setLanguageSearch(e.target.value)}
                placeholder="Search"
                className="w-full rounded-2xl py-5 pl-11 pr-4 text-sm bg-gray-50/70 border border-gray-200 focus:bg-white focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
                autoFocus
              />
            </div>

            {/* Options List: Rounded Cards with Soft Border, White BG, Ample Padding & Gaps */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
              {filteredLanguages.map((lang) => {
                const isSelected = languages.includes(lang);

                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleToggleLanguage(lang)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group",
                      isSelected
                        ? "bg-blue-50/60 border-[#1d4ed8] text-[#1d4ed8] font-bold"
                        : "bg-white border-gray-100/90 text-gray-900 hover:border-blue-400 hover:bg-blue-50/20"
                    )}
                  >
                    <span className="text-sm font-semibold truncate">{lang}</span>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                        isSelected
                          ? "bg-[#1d4ed8] border-[#1d4ed8] text-white"
                          : "border-gray-200 bg-gray-50 group-hover:border-blue-300"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}

              {filteredLanguages.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400">
                  No languages found matching &ldquo;{languageSearch}&rdquo;
                </div>
              )}
            </div>

            {/* Done Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="w-full py-3.5 rounded-full font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all shadow-md cursor-pointer text-center text-sm"
              >
                Done ({languages.length})
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Add Experience Modal */}
      {isExperienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-gray-100 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header: Left Bold Title + Right Close (X) */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-xl font-extrabold text-gray-900">
                Add experience
              </h3>
              <button
                type="button"
                onClick={handleCloseExperienceModal}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Field: Company name */}
            <div className="space-y-1.5">
              <Label htmlFor="modalCompanyName" className="font-semibold text-gray-900 text-sm">
                Company name
              </Label>
              <Input
                id="modalCompanyName"
                type="text"
                value={expCompanyName}
                onChange={(e) => setExpCompanyName(e.target.value)}
                placeholder="e.g. Flight Crew Ranked"
                className="w-full rounded-2xl py-6 px-4 text-sm bg-white border border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
                autoFocus
              />
            </div>

            {/* Field: Role */}
            <div className="space-y-1.5">
              <Label htmlFor="modalRole" className="font-semibold text-gray-900 text-sm">
                Role
              </Label>
              <Input
                id="modalRole"
                type="text"
                value={expRole}
                onChange={(e) => setExpRole(e.target.value)}
                placeholder="e.g. Aircraft Technician"
                className="w-full rounded-2xl py-6 px-4 text-sm bg-white border border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
              />
            </div>

            {/* Field: Start date with English DatePicker Portal */}
            <div className="space-y-1.5">
              <Label htmlFor="modalStartDate" className="font-semibold text-gray-900 text-sm">
                Start date
              </Label>
              <EnglishDatePicker
                id="modalStartDate"
                value={expStartDate}
                onChange={(val) => setExpStartDate(val)}
                placeholder="Select date"
              />
            </div>

            {/* Switch: Currently working here */}
            <div className="flex items-center justify-between py-1 px-1">
              <span className="font-bold text-gray-900 text-sm">
                Currently working here
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={expCurrentlyWorking}
                onClick={() => {
                  const nextVal = !expCurrentlyWorking;
                  setExpCurrentlyWorking(nextVal);
                  if (nextVal) {
                    setExpEndDate("Present");
                  } else {
                    setExpEndDate("");
                  }
                }}
                className={cn(
                  "w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0 focus:outline-none",
                  expCurrentlyWorking ? "bg-teal-500" : "bg-gray-300"
                )}
              >
                <div
                  className={cn(
                    "w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform transform",
                    expCurrentlyWorking ? "translate-x-5.5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Field: End date with English DatePicker Portal (disabled & locked when Currently working here is ON) */}
            <div className="space-y-1.5">
              <Label htmlFor="modalEndDate" className="font-semibold text-gray-900 text-sm">
                End date
              </Label>
              <EnglishDatePicker
                id="modalEndDate"
                value={expCurrentlyWorking ? "Present" : expEndDate}
                onChange={(val) => !expCurrentlyWorking && setExpEndDate(val)}
                disabled={expCurrentlyWorking}
                placeholder={expCurrentlyWorking ? "Present" : "Select date"}
              />
            </div>

            {/* Action Buttons: Cancel (outline) & Save (solid blue) */}
            <div className="flex gap-4 pt-3">
              <button
                type="button"
                onClick={handleCloseExperienceModal}
                className="flex-1 py-3.5 rounded-full font-bold text-sm border border-[#1d4ed8] text-[#1d4ed8] bg-white hover:bg-blue-50/60 transition-all cursor-pointer shadow-xs text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExperience}
                className="flex-1 py-3.5 rounded-full font-bold text-sm text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all cursor-pointer shadow-md text-center"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
