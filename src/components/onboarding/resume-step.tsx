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

  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onNext();
        return;
      }

      const personalRaw = localStorage.getItem("onboarding_personal");
      const licensesRaw = localStorage.getItem("onboarding_licenses");
      const ratingsRaw = localStorage.getItem("onboarding_ratings");
      const workRaw = localStorage.getItem("onboarding_work");
      const resumeRaw = localStorage.getItem("onboarding_resume");
      const avatarPhoto = localStorage.getItem("userProfilePhoto");

      if (personalRaw) {
        const personalData = JSON.parse(personalRaw);
        
        const crewData = {
          personal: personalData,
          licenses: licensesRaw ? JSON.parse(licensesRaw) : [],
          ratings: ratingsRaw ? JSON.parse(ratingsRaw) : [],
          work: workRaw ? JSON.parse(workRaw) : {},
          resume: resumeRaw ? JSON.parse(resumeRaw) : {},
        };

        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            first_name: personalData.firstName || "Unknown",
            last_name: personalData.lastName || "",
            avatar_url: avatarPhoto || null,
            crew_data: crewData
          });
          
        if (error) {
          console.error("Error from Supabase:", error);
          alert("Error saving profile: " + JSON.stringify(error));
        }
      }
    } catch (err) {
      console.error("Error finishing onboarding:", err);
      alert("Error finishing: " + JSON.stringify(err));
    } finally {
      setIsSaving(false);
      onNext();
    }
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
          onClick={handleFinish}
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          {isSaving ? "Saving..." : "Finish"}
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
                  <SelectItem value="ar">🇦🇷 Argentina</SelectItem>
                  <SelectItem value="au">🇦🇺 Australia</SelectItem>
                  <SelectItem value="at">🇦🇹 Austria</SelectItem>
                  <SelectItem value="bh">🇧🇭 Bahrain</SelectItem>
                  <SelectItem value="bd">🇧🇩 Bangladesh</SelectItem>
                  <SelectItem value="be">🇧🇪 Belgium</SelectItem>
                  <SelectItem value="br">🇧🇷 Brazil</SelectItem>
                  <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                  <SelectItem value="cl">🇨🇱 Chile</SelectItem>
                  <SelectItem value="cn">🇨🇳 China</SelectItem>
                  <SelectItem value="co">🇨🇴 Colombia</SelectItem>
                  <SelectItem value="cz">🇨🇿 Czech Republic</SelectItem>
                  <SelectItem value="dk">🇩🇰 Denmark</SelectItem>
                  <SelectItem value="eg">🇪🇬 Egypt</SelectItem>
                  <SelectItem value="fi">🇫🇮 Finland</SelectItem>
                  <SelectItem value="fr">🇫🇷 France</SelectItem>
                  <SelectItem value="de">🇩🇪 Germany</SelectItem>
                  <SelectItem value="gr">🇬🇷 Greece</SelectItem>
                  <SelectItem value="hu">🇭🇺 Hungary</SelectItem>
                  <SelectItem value="in">🇮🇳 India</SelectItem>
                  <SelectItem value="id">🇮🇩 Indonesia</SelectItem>
                  <SelectItem value="ie">🇮🇪 Ireland</SelectItem>
                  <SelectItem value="il">🇮🇱 Israel</SelectItem>
                  <SelectItem value="it">🇮🇹 Italy</SelectItem>
                  <SelectItem value="jp">🇯🇵 Japan</SelectItem>
                  <SelectItem value="ke">🇰🇪 Kenya</SelectItem>
                  <SelectItem value="kw">🇰🇼 Kuwait</SelectItem>
                  <SelectItem value="my">🇲🇾 Malaysia</SelectItem>
                  <SelectItem value="mx">🇲🇽 Mexico</SelectItem>
                  <SelectItem value="np">🇳🇵 Nepal</SelectItem>
                  <SelectItem value="nl">🇳🇱 Netherlands</SelectItem>
                  <SelectItem value="nz">🇳🇿 New Zealand</SelectItem>
                  <SelectItem value="ng">🇳🇬 Nigeria</SelectItem>
                  <SelectItem value="no">🇳🇴 Norway</SelectItem>
                  <SelectItem value="om">🇴🇲 Oman</SelectItem>
                  <SelectItem value="pk">🇵🇰 Pakistan</SelectItem>
                  <SelectItem value="pe">🇵🇪 Peru</SelectItem>
                  <SelectItem value="ph">🇵🇭 Philippines</SelectItem>
                  <SelectItem value="pl">🇵🇱 Poland</SelectItem>
                  <SelectItem value="pt">🇵🇹 Portugal</SelectItem>
                  <SelectItem value="qa">🇶🇦 Qatar</SelectItem>
                  <SelectItem value="ro">🇷🇴 Romania</SelectItem>
                  <SelectItem value="ru">🇷🇺 Russia</SelectItem>
                  <SelectItem value="sa">🇸🇦 Saudi Arabia</SelectItem>
                  <SelectItem value="sg">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="za">🇿🇦 South Africa</SelectItem>
                  <SelectItem value="kr">🇰🇷 South Korea</SelectItem>
                  <SelectItem value="es">🇪🇸 Spain</SelectItem>
                  <SelectItem value="lk">🇱🇰 Sri Lanka</SelectItem>
                  <SelectItem value="se">🇸🇪 Sweden</SelectItem>
                  <SelectItem value="ch">🇨🇭 Switzerland</SelectItem>
                  <SelectItem value="th">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="tr">🇹🇷 Turkey</SelectItem>
                  <SelectItem value="ae">🇦🇪 United Arab Emirates</SelectItem>
                  <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="us">🇺🇸 United States</SelectItem>
                  <SelectItem value="ve">🇻🇪 Venezuela</SelectItem>
                  <SelectItem value="vn">🇻🇳 Vietnam</SelectItem>
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
