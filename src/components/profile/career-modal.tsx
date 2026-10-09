"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Plus, X, Globe, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTodayDateString,
  validateExperienceDates,
} from "@/lib/validation/date-rules";
import {
  saveCareerExperienceAction,
  saveSkillsAction,
  saveLanguagesAction,
} from "@/actions/profile";
import { supabase } from "@/lib/supabase";

export const PREDEFINED_SKILLS = [
  "Situational awareness",
  "Decision-making",
  "Communication",
  "Leadership",
  "Problem-solving",
  "Time management",
  "Navigation skills",
  "Team coordination",
  "Technical proficiency",
  "Stress tolerance",
  "Crew Resource Management (CRM)",
  "Flight Operations",
  "Safety Management",
  "Turbine Engines",
  "Emergency Procedures",
];

export const PREDEFINED_LANGUAGES = [
  "English", "Spanish", "Mandarin Chinese", "Hindi", "French", "Arabic", "Bengali", "Portuguese", "Russian", "German", 
  "Japanese", "Punjabi", "Urdu", "Korean", "Italian", "Turkish", "Vietnamese", "Swahili", "Tamil",
  "Dutch", "Polish", "Afrikaans", "Albanian", "Amharic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bosnian",
  "Bulgarian", "Catalan", "Cebuano", "Chichewa", "Chinese (Traditional)", "Chinese (Simplified)", "Corsican", "Croatian",
  "Czech", "Danish", "Esperanto", "Estonian", "Filipino", "Finnish", "Frisian", "Galician", "Georgian", "Greek",
  "Gujarati", "Haitian Creole", "Hausa", "Hawaiian", "Hebrew", "Hmong", "Hungarian", "Icelandic", "Igbo", "Indonesian",
  "Irish", "Javanese", "Kannada", "Kazakh", "Khmer", "Kinyarwanda", "Kurdish", "Kyrgyz", "Lao", "Latin", "Latvian",
  "Lithuanian", "Luxembourgish", "Macedonian", "Malagasy", "Malay", "Malayalam", "Maltese", "Maori", "Marathi",
  "Mongolian", "Myanmar (Burmese)", "Nepali", "Norwegian", "Odia", "Pashto", "Persian", "Romanian", "Samoan",
  "Scots Gaelic", "Serbian", "Sesotho", "Shona", "Sindhi", "Sinhala", "Slovak", "Slovenian", "Somali", "Sundanese",
  "Swedish", "Tajik", "Tatar", "Telugu", "Thai", "Turkmen", "Ukrainian", "Uyghur", "Uzbek", "Welsh", "Xhosa",
  "Yiddish", "Yoruba", "Zulu"
];

export function CareerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"experience" | "skills" | "languages">("experience");

  // Experience state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrentJob, setIsCurrentJob] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Skills state (Add Skill: Pilot/Crew | Perfil - Career)
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");

  // Languages state (Add Language: Pilot/Crew | Perfil - Career)
  const [languages, setLanguages] = useState<{ name: string; proficiency: string }[]>([]);
  const [selectedLangName, setSelectedLangName] = useState("");
  const [selectedProficiency, setSelectedProficiency] = useState("Fluent");

  // Feedback states (Strict English)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const todayStr = getTodayDateString();

  // Hydrate data on open
  useEffect(() => {
    if (!isOpen) return;

    setToastError(null);
    setToastMessage(null);
    setGeneralError(null);

    // 1. Hydrate from localStorage
    try {
      const savedResume = localStorage.getItem("onboarding_resume");
      if (savedResume) {
        const parsed = JSON.parse(savedResume);
        if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          setSkills(parsed.skills);
        }
        if (Array.isArray(parsed.languages) && parsed.languages.length > 0) {
          const normalized = parsed.languages.map((l: any) =>
            typeof l === "string" ? { name: l, proficiency: "Conversational" } : l
          );
          setLanguages(normalized);
        }
      }
    } catch (e) {
      console.warn("Could not load local resume state:", e);
    }

    // 2. Hydrate from Supabase resumes table
    const loadRemote = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: resumeRow } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", session.user.id)
          .maybeSingle();

        const resumeData = (resumeRow?.data as any) || {};

        if (Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
          setSkills(resumeData.skills);
        } else if (Array.isArray(resumeData.personal?.skills) && resumeData.personal.skills.length > 0) {
          setSkills(resumeData.personal.skills);
        }

        const rawLangs = resumeData.languages || resumeData.personal?.languages;
        if (Array.isArray(rawLangs) && rawLangs.length > 0) {
          const normalized = rawLangs.map((l: any) =>
            typeof l === "string" ? { name: l, proficiency: "Conversational" } : l
          );
          setLanguages(normalized);
        }
      } catch (err) {
        console.warn("Could not load remote career details:", err);
      }
    };

    loadRemote();
  }, [isOpen]);

  // Auto-dismiss feedback toasts
  useEffect(() => {
    if (!toastError && !toastMessage) return;
    const timer = setTimeout(() => {
      setToastError(null);
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastError, toastMessage]);

  // FIX-08 UI Filtering: Predefined skills excluding already added
  const availablePredefinedSkills = PREDEFINED_SKILLS.filter(
    (skill) => !skills.some((s) => s.trim().toLowerCase() === skill.trim().toLowerCase())
  );

  // FIX-08 UI Filtering: Language options excluding already added
  const availableLanguageOptions = PREDEFINED_LANGUAGES.filter(
    (lang) => !languages.some((l) => l.name.trim().toLowerCase() === lang.trim().toLowerCase())
  );

  // Experience handlers
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val || (!isCurrentJob && endDate)) {
      const res = validateExperienceDates(val, isCurrentJob ? null : endDate, false);
      setDateError(res.error);
    } else {
      setDateError(null);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    const res = validateExperienceDates(startDate, val, false);
    setDateError(res.error);
  };

  const handleCurrentJobToggle = (checked: boolean) => {
    setIsCurrentJob(checked);
    if (checked) {
      setEndDate("");
      const res = validateExperienceDates(startDate, null, false);
      setDateError(res.error);
    } else {
      if (endDate) {
        const res = validateExperienceDates(startDate, endDate, false);
        setDateError(res.error);
      }
    }
  };

  // =========================================================================
  // FIX-08: Add Skill Handler with Uniqueness Check & Toast Feedback
  // =========================================================================
  const handleAddSkill = (skillCandidate?: string) => {
    const raw = skillCandidate !== undefined ? skillCandidate : newSkillInput;
    const trimmed = raw.trim();
    if (!trimmed) return;

    // 1. Uniqueness Check: Case-insensitive check against active list
    const isDuplicate = skills.some(
      (s) => s.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setToastError("This item is already in your list");
      return;
    }

    setSkills((prev) => [...prev, trimmed]);
    setNewSkillInput("");
    setToastError(null);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) =>
      prev.filter((s) => s.trim().toLowerCase() !== skillToRemove.trim().toLowerCase())
    );
  };

  // =========================================================================
  // FIX-08: Add Language Handler with Uniqueness Check & Toast Feedback
  // =========================================================================
  const handleAddLanguage = () => {
    const trimmed = selectedLangName.trim();
    if (!trimmed) return;

    // 1. Uniqueness Check: Case-insensitive check against active list
    const isDuplicate = languages.some(
      (l) => l.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setToastError("This item is already in your list");
      return;
    }

    setLanguages((prev) => [
      ...prev,
      { name: trimmed, proficiency: selectedProficiency || "Fluent" },
    ]);
    setSelectedLangName("");
    setToastError(null);
  };

  const handleRemoveLanguage = (langNameToRemove: string) => {
    setLanguages((prev) =>
      prev.filter((l) => l.name.trim().toLowerCase() !== langNameToRemove.trim().toLowerCase())
    );
  };

  // =========================================================================
  // Save Handler: Persist Experience, Skills & Languages with State Sync
  // =========================================================================
  const handleSave = async () => {
    setGeneralError(null);
    setToastError(null);
    setIsSaving(true);

    try {
      // 1. Validate Experience if fields are filled
      if (company.trim() || role.trim() || startDate) {
        if (!company.trim() || !role.trim()) {
          setGeneralError("Company name and role title are required.");
          setIsSaving(false);
          return;
        }

        if (!startDate) {
          setDateError("Start date is required.");
          setIsSaving(false);
          return;
        }

        const res = validateExperienceDates(startDate, isCurrentJob ? null : endDate, true);
        if (!res.isValid) {
          setDateError(res.error);
          setIsSaving(false);
          return;
        }

        // Persist experience draft locally
        try {
          const existingWork = localStorage.getItem("onboarding_work");
          const parsed = existingWork ? JSON.parse(existingWork) : {};
          const experiences = Array.isArray(parsed.experiences) ? parsed.experiences : [];
          experiences.push({
            company: company.trim(),
            title: role.trim(),
            startDate,
            endDate: isCurrentJob ? null : (endDate || null),
            isCurrent: isCurrentJob,
          });
          localStorage.setItem("onboarding_work", JSON.stringify({ ...parsed, experiences }));
        } catch (e) {
          console.warn("Could not save career experience draft:", e);
        }

        const resServer = await saveCareerExperienceAction({
          company: company.trim(),
          role: role.trim(),
          startDate,
          endDate: isCurrentJob ? null : (endDate || null),
        });

        if (!resServer.success) {
          setGeneralError(resServer.error || "Failed to save career experience.");
          setIsSaving(false);
          return;
        }
      }

      // 2. Persist Skills & Languages in localStorage for instant sync
      try {
        const savedResume = localStorage.getItem("onboarding_resume");
        const resumeParsed = savedResume ? JSON.parse(savedResume) : {};
        localStorage.setItem(
          "onboarding_resume",
          JSON.stringify({
            ...resumeParsed,
            skills,
            languages,
          })
        );
      } catch (e) {
        console.warn("Could not sync local onboarding_resume:", e);
      }

      // 3. Persist Skills via Server Action
      const skillsRes = await saveSkillsAction(skills);
      if (!skillsRes.success) {
        if (skillsRes.error === "This item is already in your list") {
          setToastError("This item is already in your list");
          setIsSaving(false);
          return;
        }
        setGeneralError(skillsRes.error || "Failed to save skills.");
        setIsSaving(false);
        return;
      }

      // 4. Persist Languages via Server Action
      const languagesRes = await saveLanguagesAction(languages);
      if (!languagesRes.success) {
        if (languagesRes.error === "This item is already in your list") {
          setToastError("This item is already in your list");
          setIsSaving(false);
          return;
        }
        setGeneralError(languagesRes.error || "Failed to save languages.");
        setIsSaving(false);
        return;
      }

      setToastMessage("Career details saved successfully!");
      setTimeout(() => {
        setIsOpen(false);
        setToastMessage(null);
        setCompany("");
        setRole("");
        setStartDate("");
        setEndDate("");
        setIsCurrentJob(false);
        setDateError(null);
      }, 1200);
    } catch (err: any) {
      console.error("Error in CareerModal save:", err);
      setGeneralError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          Edit Career Experience
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-6 rounded-3xl bg-white overflow-hidden">
          <DialogHeader className="shrink-0 mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Career &amp; Skills (Perfil - Career)
            </DialogTitle>
          </DialogHeader>

          {/* Toast Notification Banner (FIX-08 Uniqueness Feedback) */}
          {toastError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2 shrink-0 animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold">{toastError}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastError(null)}
                className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shrink-0 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
          )}

          {generalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 shrink-0 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100 shrink-0 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setActiveTab("experience")}
              className={cn(
                "pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer",
                activeTab === "experience"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              Experience
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("skills")}
              className={cn(
                "pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "skills"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              <span>Skills</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
                {skills.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("languages")}
              className={cn(
                "pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "languages"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              <span>Languages</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
                {languages.length}
              </span>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-4">
            {/* =========================================================================
                TAB 1: WORK EXPERIENCE
                ========================================================================= */}
            {activeTab === "experience" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <Label htmlFor="companyName">Company</Label>
                  <Input
                    id="companyName"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Delta Airlines"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="roleTitle">Role / Title</Label>
                  <Input
                    id="roleTitle"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. First Officer B737"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="expStart">Start Date</Label>
                  <Input
                    id="expStart"
                    type="date"
                    max={todayStr}
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className={cn("rounded-xl", dateError && !endDate ? "border-red-500" : "")}
                  />
                  <span className="text-gray-400 text-xs">Cannot exceed current date</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="expEnd">End Date</Label>
                    <label className="text-xs text-gray-500 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCurrentJob}
                        onChange={(e) => handleCurrentJobToggle(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Currently working here</span>
                    </label>
                  </div>
                  <Input
                    id="expEnd"
                    type="date"
                    min={startDate || undefined}
                    disabled={isCurrentJob}
                    value={isCurrentJob ? "" : endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    placeholder={isCurrentJob ? "Present" : undefined}
                    className={cn("rounded-xl", dateError ? "border-red-500" : "")}
                  />
                  {isCurrentJob && (
                    <span className="text-gray-400 text-xs">Handled as current job (nullable End Date)</span>
                  )}
                </div>

                {dateError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{dateError}</span>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                TAB 2: SKILLS (Add Skill: Pilot/Crew | Perfil - Career)
                ========================================================================= */}
            {activeTab === "skills" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <Label htmlFor="skillInput" className="text-gray-700 font-semibold">
                    Add Skill
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="skillInput"
                      placeholder="e.g. Navigation skills"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      className="rounded-xl flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => handleAddSkill()}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Predefined Recommended Skills with UI Filtering */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Recommended Aviation Skills
                  </p>
                  {availablePredefinedSkills.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">All recommended skills added</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-xl border-gray-100 bg-gray-50/50">
                      {availablePredefinedSkills.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddSkill(preset)}
                          className="text-xs bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-gray-400" />
                          <span>{preset}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Skills List */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Active Skills</span>
                    <span className="text-xs text-gray-500 font-mono">{skills.length} added</span>
                  </div>
                  {skills.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No skills in your active list yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium shadow-2xs"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:bg-blue-200/60 rounded-full p-0.5 text-blue-600 transition-colors cursor-pointer"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 3: LANGUAGES (Add Language: Pilot/Crew | Perfil - Career)
                ========================================================================= */}
            {activeTab === "languages" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <Label className="text-gray-700 font-semibold">Add Language</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select
                      value={selectedLangName}
                      onValueChange={(val) => setSelectedLangName(val || "")}
                    >
                      <SelectTrigger className="rounded-xl w-full text-sm">
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {/* FIX-08 UI Filtering: Already added languages are filtered out */}
                        {availableLanguageOptions.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedProficiency}
                      onValueChange={(val) => setSelectedProficiency(val || "Fluent")}
                    >
                      <SelectTrigger className="rounded-xl w-full text-sm">
                        <SelectValue placeholder="Proficiency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Native">Native</SelectItem>
                        <SelectItem value="Fluent">Fluent</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddLanguage}
                    disabled={!selectedLangName}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Language
                  </Button>
                </div>

                {/* Active Languages List */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Active Languages</span>
                    <span className="text-xs text-gray-500 font-mono">{languages.length} added</span>
                  </div>
                  {languages.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No languages added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {languages.map((lang, idx) => (
                        <div
                          key={`${lang.name}-${idx}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-semibold text-gray-900">{lang.name}</span>
                            <span className="text-xs text-gray-500 font-medium">
                              ({lang.proficiency})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguage(lang.name)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                            aria-label={`Remove ${lang.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-end gap-2 pt-3 border-t border-gray-100 shrink-0">
            <DialogClose render={<Button type="button" variant="secondary" />}>
              Close
            </DialogClose>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!!dateError || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
