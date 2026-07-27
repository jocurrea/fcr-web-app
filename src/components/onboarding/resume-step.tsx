import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface ResumeStepProps {
  onNext: () => void;
}

export function ResumeStep({ onNext }: ResumeStepProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top of the container
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    // Also scroll the window just in case
    window.scrollTo(0, 0);
  }, []);

  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websites, setWebsites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.websites) return p.websites; }
    }
    return [];
  });

  const [phone, setPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.phone) return p.phone; }
    }
    return "";
  });
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.email) return p.email; }
    }
    return "";
  });
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
      if (isValid || e.target.value === "") {
        setEmailError("");
      }
    }
  };

  const handleEmailBlur = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillText, setSkillText] = useState("");
  const [skills, setSkills] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.skills) return p.skills; }
    }
    return [];
  });

  const ALL_PREDEFINED_SKILLS = [
    "Situational awareness",
    "Decision-making",
    "Communication",
    "Leadership",
    "Problem-solving",
    "Time management",
    "Navigation skills",
    "Team coordination",
    "Technical proficiency",
    "Stress tolerance"
  ];

  const availableSkills = ALL_PREDEFINED_SKILLS.filter(skill => !skills.includes(skill));

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [langName, setLangName] = useState("");
  const [langProficiency, setLangProficiency] = useState("");
  const [languages, setLanguages] = useState<{name: string, proficiency: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.languages) return p.languages; }
    }
    return [];
  });

  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardText, setAwardText] = useState("");
  const [awards, setAwards] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.awards) return p.awards; }
    }
    return [];
  });

  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [trainingFacility, setTrainingFacility] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [trainingDetails, setTrainingDetails] = useState("");
  const [trainingFacilities, setTrainingFacilities] = useState<{facility: string, type: string, details: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.trainingFacilities) return p.trainingFacilities; }
    }
    return [];
  });

  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expCompany, setExpCompany] = useState("");
  const [expCountry, setExpCountry] = useState("");
  const [expCity, setExpCity] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expPlanes, setExpPlanes] = useState<string[]>([]);
  const [expPlaneInput, setExpPlaneInput] = useState("");
  const [isAddingPlane, setIsAddingPlane] = useState(false);
  const [expStartDate, setExpStartDate] = useState("");
  const [expEndDate, setExpEndDate] = useState("");
  const [experiences, setExperiences] = useState<{
    company: string, country: string, city: string, title: string, role: string, planes: string[], startDate: string, endDate: string
  }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_resume");
      if (saved) { const p = JSON.parse(saved); if (p.experiences) return p.experiences; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("onboarding_resume", JSON.stringify({
      phone, email, websites, skills, languages, awards, trainingFacilities, experiences
    }));
  }, [phone, email, websites, skills, languages, awards, trainingFacilities, experiences]);

  const handleFinishLocal = () => {
    onNext();
  };

  const languageOptions = [
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
  return (
    <div className="flex-1 flex flex-col mt-4">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-20 space-y-6">
        
        {/* Contact Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Contact</h2>
          
          <div className="space-y-2">
            <Label className="text-gray-700">Phone</Label>
            <Input 
              className="rounded-2xl py-6" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Email</Label>
            <Input 
              type="email" 
              className={cn("rounded-2xl py-6", emailError ? "border-red-500 focus-visible:ring-red-500" : "")} 
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Address</Label>
            <Input className="rounded-2xl py-6" />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700">Websites</Label>
              <button 
                type="button" 
                onClick={() => setIsWebsiteModalOpen(true)}
                className="text-blue-600 font-medium text-sm hover:text-blue-700"
              >
                + Add
              </button>
            </div>
            {websites.length === 0 ? (
              <p className="text-sm text-gray-500 mt-1">No websites added yet</p>
            ) : (
              <div className="flex flex-col gap-1 mt-1">
                {websites.map((url, i) => (
                  <p key={i} className="text-sm text-blue-600 truncate">{url}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-bold text-gray-900">Summary</h2>
          <Textarea 
            placeholder="Brief summary" 
            className="rounded-2xl p-4 min-h-[120px]" 
          />
        </div>

        {/* Top Skills Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Top Skills</h2>
            <button 
              type="button" 
              onClick={() => setIsSkillModalOpen(true)}
              className="text-blue-600 font-medium text-sm hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">No skills added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill, i) => (
                <div key={i} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm flex items-center gap-2">
                  {skill}
                  <button 
                    type="button" 
                    onClick={() => setSkills(skills.filter(s => s !== skill))}
                    className="hover:opacity-80 transition-opacity flex items-center justify-center"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Languages Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Languages</h2>
            <button 
              type="button" 
              onClick={() => setIsLangModalOpen(true)}
              className="text-blue-600 font-medium text-sm hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          {languages.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">No languages added yet</p>
          ) : (
            <div className="space-y-3 mt-4">
              {languages.map((lang, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-base">
                    <span className="font-semibold text-gray-900">{lang.name}</span>
                    <span className="text-gray-500 ml-2">({lang.proficiency})</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setLanguages(languages.filter((_, index) => index !== i))}
                    className="hover:opacity-80 transition-opacity flex items-center justify-center"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Honors - awards Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Honors - awards</h2>
            <button 
              type="button" 
              onClick={() => setIsAwardModalOpen(true)}
              className="text-blue-600 font-medium text-sm hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          {awards.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">No awards added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {awards.map((award, i) => (
                <div key={i} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm flex items-center gap-2">
                  {award}
                  <button 
                    type="button" 
                    onClick={() => setAwards(awards.filter((_, index) => index !== i))}
                    className="hover:opacity-80 transition-opacity flex items-center justify-center"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Info Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-bold text-gray-900">General Info</h2>
          
          <div className="space-y-2">
            <Label className="text-gray-700">Date of birth</Label>
            <div className="relative">
              <Input type="date" className="rounded-2xl py-6" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Marital Status</Label>
            <Select>
              <SelectTrigger className="w-full rounded-2xl py-6 text-gray-500">
                <SelectValue placeholder="Select an Item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
                <SelectItem value="separated">Separated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Children</Label>
            <Input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue="0"
              className="rounded-2xl py-6" 
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
              }}
              onBlur={(e) => {
                if (e.target.value === "") {
                  e.target.value = "0";
                }
              }}
            />
          </div>
        </div>

        {/* Training Facilities Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Training Facilities</h2>
            <button 
              type="button" 
              onClick={() => setIsTrainingModalOpen(true)}
              className="text-blue-600 font-medium text-sm hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          {trainingFacilities.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">No training facilities added yet</p>
          ) : (
            <div className="space-y-4 mt-4">
              {trainingFacilities.map((tf, i) => (
                <div key={i} className="flex items-start justify-between">
                  <div className="text-base">
                    <div className="font-semibold text-gray-900">
                      {tf.facility}
                      {tf.type && <span className="text-gray-500 font-normal ml-2">({tf.type})</span>}
                    </div>
                    {tf.details && <div className="text-sm text-gray-600 mt-1">{tf.details}</div>}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setTrainingFacilities(trainingFacilities.filter((_, index) => index !== i))}
                    className="hover:opacity-80 transition-opacity flex items-center justify-center shrink-0 ml-4 mt-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experience Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Experience</h2>
            <button 
              type="button" 
              onClick={() => setIsExpModalOpen(true)}
              className="text-blue-600 font-medium text-sm hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          {experiences.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">No experience added yet</p>
          ) : (
            <div className="space-y-4 mt-4">
              {experiences.map((exp, i) => (
                <div key={i} className="flex items-start justify-between">
                  <div className="text-base">
                    <div className="font-semibold text-gray-900">
                      {exp.title} at {exp.company}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {exp.startDate} - {exp.endDate || "Present"} | {exp.city}, {exp.country}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setExperiences(experiences.filter((_, index) => index !== i))}
                    className="hover:opacity-80 transition-opacity flex items-center justify-center shrink-0 ml-4 mt-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-bold text-gray-900">Profile</h2>
          
          <div className="space-y-2">
            <Label className="text-gray-700">English Proficient</Label>
            <Select>
              <SelectTrigger className="w-full rounded-2xl py-6 text-gray-500">
                <SelectValue placeholder="Select a Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>

      <div className="p-4 bg-white mt-auto mb-4">
        <Button 
          onClick={handleFinishLocal}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          Finish
        </Button>
      </div>

      <Dialog open={isWebsiteModalOpen} onOpenChange={setIsWebsiteModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Add website
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Input 
              placeholder="Enter URL" 
              className="rounded-2xl py-6"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <div className="flex gap-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
                onClick={() => {
                  setIsWebsiteModalOpen(false);
                  setWebsiteUrl("");
                }}
              >
                close
              </Button>
              <Button 
                type="button"
                className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
                onClick={() => {
                  if (websiteUrl.trim()) {
                    setWebsites([...websites, websiteUrl.trim()]);
                    setWebsiteUrl("");
                    setIsWebsiteModalOpen(false);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSkillModalOpen} onOpenChange={setIsSkillModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Add Skill
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <Input 
              placeholder="Enter text" 
              className="rounded-2xl py-6"
              value={skillText}
              onChange={(e) => setSkillText(e.target.value)}
            />
            
            <p className="text-gray-400 text-sm">or choose from the list of skills</p>
            
            <div className="space-y-2 pb-2">
              {availableSkills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    setSkillText(skill);
                  }}
                  className="w-full text-left px-4 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-6 shrink-0">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
              onClick={() => {
                setIsSkillModalOpen(false);
                setSkillText("");
              }}
            >
              close
            </Button>
            <Button 
              type="button"
              className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
              onClick={() => {
                if (skillText.trim()) {
                  setSkills([...skills, skillText.trim()]);
                  setSkillText("");
                  setIsSkillModalOpen(false);
                }
              }}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLangModalOpen} onOpenChange={setIsLangModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Add Language
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            
            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Name</Label>
              <Select value={langName} onValueChange={(val) => setLangName(val || "")}>
                <SelectTrigger className="w-full rounded-2xl py-6 text-gray-500">
                  <SelectValue placeholder="Select an Item" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Proficiency</Label>
              <Select value={langProficiency} onValueChange={(val) => setLangProficiency(val || "")}>
                <SelectTrigger className="w-full rounded-2xl py-6 text-gray-500">
                  <SelectValue placeholder="Select an Item" />
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

            <div className="flex gap-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
                onClick={() => {
                  setIsLangModalOpen(false);
                  setLangName("");
                  setLangProficiency("");
                }}
              >
                close
              </Button>
              <Button 
                type="button"
                className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
                onClick={() => {
                  if (langName && langProficiency) {
                    setLanguages([...languages, { name: langName, proficiency: langProficiency }]);
                    setLangName("");
                    setLangProficiency("");
                    setIsLangModalOpen(false);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAwardModalOpen} onOpenChange={setIsAwardModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Add award
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            
            <Input 
              placeholder="Enter text" 
              className="rounded-2xl py-6"
              value={awardText}
              onChange={(e) => setAwardText(e.target.value)}
            />

            <div className="flex gap-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
                onClick={() => {
                  setIsAwardModalOpen(false);
                  setAwardText("");
                }}
              >
                close
              </Button>
              <Button 
                type="button"
                className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
                onClick={() => {
                  if (awardText.trim()) {
                    setAwards([...awards, awardText.trim()]);
                    setAwardText("");
                    setIsAwardModalOpen(false);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTrainingModalOpen} onOpenChange={setIsTrainingModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Education
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            
            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Training Facility</Label>
              <Input 
                className="rounded-2xl py-6"
                value={trainingFacility}
                onChange={(e) => setTrainingFacility(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Type</Label>
              <Input 
                className="rounded-2xl py-6"
                value={trainingType}
                onChange={(e) => setTrainingType(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Details</Label>
              <Textarea 
                className="rounded-2xl py-4 min-h-[100px]"
                value={trainingDetails}
                onChange={(e) => setTrainingDetails(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
                onClick={() => {
                  setIsTrainingModalOpen(false);
                  setTrainingFacility("");
                  setTrainingType("");
                  setTrainingDetails("");
                }}
              >
                close
              </Button>
              <Button 
                type="button"
                className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
                onClick={() => {
                  if (trainingFacility.trim()) {
                    setTrainingFacilities([
                      ...trainingFacilities, 
                      { 
                        facility: trainingFacility.trim(), 
                        type: trainingType.trim(), 
                        details: trainingDetails.trim() 
                      }
                    ]);
                    setTrainingFacility("");
                    setTrainingType("");
                    setTrainingDetails("");
                    setIsTrainingModalOpen(false);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpModalOpen} onOpenChange={setIsExpModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Add Experience
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-6">
            
            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Company</Label>
              <Input 
                className="rounded-2xl py-6"
                value={expCompany}
                onChange={(e) => setExpCompany(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Country</Label>
              <Select value={expCountry} onValueChange={(val) => setExpCountry(val || "")}>
                <SelectTrigger className="w-full rounded-2xl py-6 text-gray-500">
                  <SelectValue placeholder="Select an Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ar.png" srcSet="https://flagcdn.com/w40/ar.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Argentina</span></div></SelectItem>
                  <SelectItem value="au"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/au.png" srcSet="https://flagcdn.com/w40/au.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Australia</span></div></SelectItem>
                  <SelectItem value="at"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/at.png" srcSet="https://flagcdn.com/w40/at.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Austria</span></div></SelectItem>
                  <SelectItem value="bh"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/bh.png" srcSet="https://flagcdn.com/w40/bh.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Bahrain</span></div></SelectItem>
                  <SelectItem value="bd"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/bd.png" srcSet="https://flagcdn.com/w40/bd.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Bangladesh</span></div></SelectItem>
                  <SelectItem value="be"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/be.png" srcSet="https://flagcdn.com/w40/be.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Belgium</span></div></SelectItem>
                  <SelectItem value="br"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/br.png" srcSet="https://flagcdn.com/w40/br.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Brazil</span></div></SelectItem>
                  <SelectItem value="ca"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ca.png" srcSet="https://flagcdn.com/w40/ca.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Canada</span></div></SelectItem>
                  <SelectItem value="cl"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/cl.png" srcSet="https://flagcdn.com/w40/cl.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Chile</span></div></SelectItem>
                  <SelectItem value="cn"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/cn.png" srcSet="https://flagcdn.com/w40/cn.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>China</span></div></SelectItem>
                  <SelectItem value="co"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/co.png" srcSet="https://flagcdn.com/w40/co.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Colombia</span></div></SelectItem>
                  <SelectItem value="cz"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/cz.png" srcSet="https://flagcdn.com/w40/cz.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Czech Republic</span></div></SelectItem>
                  <SelectItem value="dk"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/dk.png" srcSet="https://flagcdn.com/w40/dk.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Denmark</span></div></SelectItem>
                  <SelectItem value="eg"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/eg.png" srcSet="https://flagcdn.com/w40/eg.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Egypt</span></div></SelectItem>
                  <SelectItem value="fi"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/fi.png" srcSet="https://flagcdn.com/w40/fi.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Finland</span></div></SelectItem>
                  <SelectItem value="fr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/fr.png" srcSet="https://flagcdn.com/w40/fr.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>France</span></div></SelectItem>
                  <SelectItem value="de"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/de.png" srcSet="https://flagcdn.com/w40/de.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Germany</span></div></SelectItem>
                  <SelectItem value="gr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/gr.png" srcSet="https://flagcdn.com/w40/gr.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Greece</span></div></SelectItem>
                  <SelectItem value="hu"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/hu.png" srcSet="https://flagcdn.com/w40/hu.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Hungary</span></div></SelectItem>
                  <SelectItem value="in"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/in.png" srcSet="https://flagcdn.com/w40/in.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>India</span></div></SelectItem>
                  <SelectItem value="id"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/id.png" srcSet="https://flagcdn.com/w40/id.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Indonesia</span></div></SelectItem>
                  <SelectItem value="ie"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ie.png" srcSet="https://flagcdn.com/w40/ie.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Ireland</span></div></SelectItem>
                  <SelectItem value="il"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/il.png" srcSet="https://flagcdn.com/w40/il.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Israel</span></div></SelectItem>
                  <SelectItem value="it"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/it.png" srcSet="https://flagcdn.com/w40/it.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Italy</span></div></SelectItem>
                  <SelectItem value="jp"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/jp.png" srcSet="https://flagcdn.com/w40/jp.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Japan</span></div></SelectItem>
                  <SelectItem value="ke"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ke.png" srcSet="https://flagcdn.com/w40/ke.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Kenya</span></div></SelectItem>
                  <SelectItem value="kw"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/kw.png" srcSet="https://flagcdn.com/w40/kw.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Kuwait</span></div></SelectItem>
                  <SelectItem value="my"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/my.png" srcSet="https://flagcdn.com/w40/my.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Malaysia</span></div></SelectItem>
                  <SelectItem value="mx"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/mx.png" srcSet="https://flagcdn.com/w40/mx.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Mexico</span></div></SelectItem>
                  <SelectItem value="np"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/np.png" srcSet="https://flagcdn.com/w40/np.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Nepal</span></div></SelectItem>
                  <SelectItem value="nl"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/nl.png" srcSet="https://flagcdn.com/w40/nl.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Netherlands</span></div></SelectItem>
                  <SelectItem value="nz"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/nz.png" srcSet="https://flagcdn.com/w40/nz.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>New Zealand</span></div></SelectItem>
                  <SelectItem value="ng"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ng.png" srcSet="https://flagcdn.com/w40/ng.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Nigeria</span></div></SelectItem>
                  <SelectItem value="no"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/no.png" srcSet="https://flagcdn.com/w40/no.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Norway</span></div></SelectItem>
                  <SelectItem value="om"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/om.png" srcSet="https://flagcdn.com/w40/om.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Oman</span></div></SelectItem>
                  <SelectItem value="pk"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pk.png" srcSet="https://flagcdn.com/w40/pk.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Pakistan</span></div></SelectItem>
                  <SelectItem value="pe"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pe.png" srcSet="https://flagcdn.com/w40/pe.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Peru</span></div></SelectItem>
                  <SelectItem value="ph"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ph.png" srcSet="https://flagcdn.com/w40/ph.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Philippines</span></div></SelectItem>
                  <SelectItem value="pl"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pl.png" srcSet="https://flagcdn.com/w40/pl.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Poland</span></div></SelectItem>
                  <SelectItem value="pt"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/pt.png" srcSet="https://flagcdn.com/w40/pt.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Portugal</span></div></SelectItem>
                  <SelectItem value="qa"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/qa.png" srcSet="https://flagcdn.com/w40/qa.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Qatar</span></div></SelectItem>
                  <SelectItem value="ro"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ro.png" srcSet="https://flagcdn.com/w40/ro.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Romania</span></div></SelectItem>
                  <SelectItem value="ru"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ru.png" srcSet="https://flagcdn.com/w40/ru.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Russia</span></div></SelectItem>
                  <SelectItem value="sa"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/sa.png" srcSet="https://flagcdn.com/w40/sa.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Saudi Arabia</span></div></SelectItem>
                  <SelectItem value="sg"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/sg.png" srcSet="https://flagcdn.com/w40/sg.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Singapore</span></div></SelectItem>
                  <SelectItem value="za"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/za.png" srcSet="https://flagcdn.com/w40/za.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>South Africa</span></div></SelectItem>
                  <SelectItem value="kr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/kr.png" srcSet="https://flagcdn.com/w40/kr.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>South Korea</span></div></SelectItem>
                  <SelectItem value="es"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/es.png" srcSet="https://flagcdn.com/w40/es.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Spain</span></div></SelectItem>
                  <SelectItem value="lk"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/lk.png" srcSet="https://flagcdn.com/w40/lk.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Sri Lanka</span></div></SelectItem>
                  <SelectItem value="se"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/se.png" srcSet="https://flagcdn.com/w40/se.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Sweden</span></div></SelectItem>
                  <SelectItem value="ch"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ch.png" srcSet="https://flagcdn.com/w40/ch.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Switzerland</span></div></SelectItem>
                  <SelectItem value="th"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/th.png" srcSet="https://flagcdn.com/w40/th.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Thailand</span></div></SelectItem>
                  <SelectItem value="tr"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/tr.png" srcSet="https://flagcdn.com/w40/tr.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Turkey</span></div></SelectItem>
                  <SelectItem value="ae"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ae.png" srcSet="https://flagcdn.com/w40/ae.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>United Arab Emirates</span></div></SelectItem>
                  <SelectItem value="gb"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/gb.png" srcSet="https://flagcdn.com/w40/gb.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>United Kingdom</span></div></SelectItem>
                  <SelectItem value="us"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/us.png" srcSet="https://flagcdn.com/w40/us.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>United States</span></div></SelectItem>
                  <SelectItem value="ve"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/ve.png" srcSet="https://flagcdn.com/w40/ve.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Venezuela</span></div></SelectItem>
                  <SelectItem value="vn"><div className="flex items-center gap-2"><img src="https://flagcdn.com/w20/vn.png" srcSet="https://flagcdn.com/w40/vn.png 2x" width="20" alt="" className="rounded-sm shadow-sm" /> <span>Vietnam</span></div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">city</Label>
              <Input 
                className="rounded-2xl py-6"
                value={expCity}
                onChange={(e) => setExpCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Title</Label>
              <Input 
                className="rounded-2xl py-6"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Role</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExpRole("Pilot in Command")}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-colors ${
                    expRole === "Pilot in Command"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  Pilot in Command
                </button>
                <button
                  type="button"
                  onClick={() => setExpRole("Second in Command")}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-colors ${
                    expRole === "Second in Command"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  Second in Command
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 font-bold">Planes Flown</Label>
                <button 
                  type="button" 
                  onClick={() => setIsAddingPlane(true)}
                  className="text-blue-600 font-medium text-sm hover:text-blue-700"
                >
                  + Add
                </button>
              </div>

              {expPlanes.length === 0 ? (
                <p className="text-sm text-gray-500 mt-1">No plans added yet</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {expPlanes.map((plane, i) => (
                    <div key={i} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2">
                      {plane}
                      <button 
                        type="button" 
                        onClick={() => setExpPlanes(expPlanes.filter((_, index) => index !== i))}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal">Start Date</Label>
              <Input 
                type="date"
                className="rounded-2xl py-6"
                value={expStartDate}
                onChange={(e) => setExpStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-normal flex flex-col items-start text-left">
                <span>End Date</span>
                <span className="text-gray-400 text-sm">(leave empty if you are currently working here)</span>
              </Label>
              <Input 
                type="date"
                className="rounded-2xl py-6"
                value={expEndDate}
                onChange={(e) => setExpEndDate(e.target.value)}
              />
            </div>

          </div>

          <div className="flex gap-4 pt-4 shrink-0 border-t mt-4">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
              onClick={() => {
                setIsExpModalOpen(false);
              }}
            >
              close
            </Button>
            <Button 
              type="button"
              className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
              onClick={() => {
                if (expCompany && expTitle) {
                  setExperiences([
                    ...experiences, 
                    { 
                      company: expCompany, 
                      country: expCountry, 
                      city: expCity, 
                      title: expTitle, 
                      role: expRole, 
                      planes: expPlanes, 
                      startDate: expStartDate, 
                      endDate: expEndDate 
                    }
                  ]);
                  setExpCompany("");
                  setExpCountry("");
                  setExpCity("");
                  setExpTitle("");
                  setExpRole("");
                  setExpPlanes([]);
                  setExpStartDate("");
                  setExpEndDate("");
                  setIsExpModalOpen(false);
                }
              }}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingPlane} onOpenChange={setIsAddingPlane}>
        <DialogContent className="sm:max-w-[400px] bg-white p-6 rounded-3xl z-[100]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Add Plane
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Input 
              placeholder="Enter text" 
              className="rounded-2xl py-6"
              value={expPlaneInput}
              onChange={(e) => setExpPlaneInput(e.target.value)}
            />

            <div className="flex gap-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 rounded-full py-6 text-blue-600 border-blue-600 hover:bg-blue-50 text-base"
                onClick={() => {
                  setIsAddingPlane(false);
                  setExpPlaneInput("");
                }}
              >
                close
              </Button>
              <Button 
                type="button"
                className="flex-1 rounded-full py-6 bg-blue-600 hover:bg-blue-700 text-white text-base"
                onClick={() => {
                  if (expPlaneInput.trim()) {
                    setExpPlanes([...expPlanes, expPlaneInput.trim()]);
                    setExpPlaneInput("");
                    setIsAddingPlane(false);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
