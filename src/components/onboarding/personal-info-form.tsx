"use client";

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
import { Search, Check, ChevronDown, Upload, X, Camera, Image as ImageIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const COUNTRIES = [
  { id: "ar", label: "Argentina" },
  { id: "au", label: "Australia" },
  { id: "at", label: "Austria" },
  { id: "bh", label: "Bahrain" },
  { id: "bd", label: "Bangladesh" },
  { id: "be", label: "Belgium" },
  { id: "br", label: "Brazil" },
  { id: "ca", label: "Canada" },
  { id: "cl", label: "Chile" },
  { id: "cn", label: "China" },
  { id: "co", label: "Colombia" },
  { id: "cz", label: "Czech Republic" },
  { id: "dk", label: "Denmark" },
  { id: "eg", label: "Egypt" },
  { id: "fi", label: "Finland" },
  { id: "fr", label: "France" },
  { id: "de", label: "Germany" },
  { id: "gr", label: "Greece" },
  { id: "hu", label: "Hungary" },
  { id: "in", label: "India" },
  { id: "id", label: "Indonesia" },
  { id: "ie", label: "Ireland" },
  { id: "il", label: "Israel" },
  { id: "it", label: "Italy" },
  { id: "jp", label: "Japan" },
  { id: "ke", label: "Kenya" },
  { id: "kw", label: "Kuwait" },
  { id: "my", label: "Malaysia" },
  { id: "mx", label: "Mexico" },
  { id: "np", label: "Nepal" },
  { id: "nl", label: "Netherlands" },
  { id: "nz", label: "New Zealand" },
  { id: "ng", label: "Nigeria" },
  { id: "no", label: "Norway" },
  { id: "om", label: "Oman" },
  { id: "pk", label: "Pakistan" },
  { id: "pe", label: "Peru" },
  { id: "ph", label: "Philippines" },
  { id: "pl", label: "Poland" },
  { id: "pt", label: "Portugal" },
  { id: "qa", label: "Qatar" },
  { id: "ro", label: "Romania" },
  { id: "ru", label: "Russia" },
  { id: "sa", label: "Saudi Arabia" },
  { id: "sg", label: "Singapore" },
  { id: "za", label: "South Africa" },
  { id: "kr", label: "South Korea" },
  { id: "es", label: "Spain" },
  { id: "lk", label: "Sri Lanka" },
  { id: "se", label: "Sweden" },
  { id: "ch", label: "Switzerland" },
  { id: "th", label: "Thailand" },
  { id: "tr", label: "Turkey" },
  { id: "ae", label: "United Arab Emirates" },
  { id: "gb", label: "United Kingdom" },
  { id: "us", label: "United States" },
  { id: "ve", label: "Venezuela" },
  { id: "vn", label: "Vietnam" }
];

interface PersonalInfoFormProps {
  onNext: () => void;
}

export function PersonalInfoForm({ onNext }: PersonalInfoFormProps) {
  // Photo Upload State
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  useEffect(() => {
    const savedPhoto = localStorage.getItem("userProfilePhoto");
    if (savedPhoto) {
      setPhotoPreview(savedPhoto);
    }
  }, []);
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large (max 10MB)");
        if (e.target) e.target.value = "";
        return;
      }
      
      // Instant Base64 preview & local storage
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setPhotoPreview(dataUrl);
          try {
            localStorage.setItem("userProfilePhoto", dataUrl);
          } catch (err) {
            console.warn(err);
          }
        }
      };
      reader.readAsDataURL(file);

      const localUrl = URL.createObjectURL(file);
      if (e.target) e.target.value = "";
      
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const filePath = `avatars/${userData.user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, file, { upsert: true });
            
          if (uploadError) {
            console.warn("Storage upload fallback:", uploadError);
            return;
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);
            
          if (publicUrlData?.publicUrl) {
            try {
              localStorage.setItem("userProfilePhoto", publicUrlData.publicUrl);
            } catch (err) {
              console.warn(err);
            }
            setPhotoPreview(publicUrlData.publicUrl);
            await supabase
              .from('users')
              .update({ profileImage: publicUrlData.publicUrl })
              .eq('id', userData.user.id);
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };

  const [role, setRole] = useState<"pilot" | "crew">("pilot");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [description, setDescription] = useState("");
  const [currentEmployer, setCurrentEmployer] = useState("");
  const [totalFlightHours, setTotalFlightHours] = useState("");

  const sanitizeName = (val: string) => val.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');

  // Load draft from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_personal");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.role) setRole(parsed.role);
          if (parsed.selectedCountry) setSelectedCountry(parsed.selectedCountry);
          if (parsed.firstName) setFirstName(sanitizeName(parsed.firstName));
          if (parsed.middleName) setMiddleName(sanitizeName(parsed.middleName));
          if (parsed.lastName) setLastName(sanitizeName(parsed.lastName));
          if (parsed.description) setDescription(parsed.description);
          if (parsed.currentEmployer) setCurrentEmployer(parsed.currentEmployer);
          if (parsed.totalFlightHours) setTotalFlightHours(parsed.totalFlightHours);
        } catch (e) {
          console.error("Error parsing localStorage", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [userRecord, resumeRecord] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('resumes').select('data').eq('userId', session.user.id).single()
      ]);

      if (userRecord.data) {
        if (userRecord.data.firstName) setFirstName(sanitizeName(userRecord.data.firstName));
        if (userRecord.data.middleName) setMiddleName(sanitizeName(userRecord.data.middleName));
        if (userRecord.data.lastName) setLastName(sanitizeName(userRecord.data.lastName));
        if (userRecord.data.profileImage) setPhotoPreview(userRecord.data.profileImage);
      }
      
      if (resumeRecord.data && resumeRecord.data.data && resumeRecord.data.data.personal) {
        const personalData = resumeRecord.data.data.personal;
        if (personalData.selectedCountry) setSelectedCountry(personalData.selectedCountry);
        if (personalData.description) setDescription(personalData.description);
        if (personalData.currentEmployer) setCurrentEmployer(personalData.currentEmployer);
        if (personalData.totalFlightHours) setTotalFlightHours(personalData.totalFlightHours);
        if (personalData.role) setRole(personalData.role);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    // We will save everything at the end of the onboarding flow
    onNext();
  };

  useEffect(() => {
    try {
      const prev = localStorage.getItem("onboarding_personal");
      const parsed = prev ? JSON.parse(prev) : {};
      localStorage.setItem(
        "onboarding_personal",
        JSON.stringify({
          ...parsed,
          role,
          selectedCountry,
          firstName,
          middleName,
          lastName,
          description,
          currentEmployer,
          totalFlightHours,
        })
      );
    } catch (e) {
      console.error("Error writing to onboarding_personal:", e);
    }
  }, [role, selectedCountry, firstName, middleName, lastName, description, currentEmployer, totalFlightHours]);

  const filteredCountries = COUNTRIES.filter(country => 
    country.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 mt-6 min-h-0">
      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 -mx-2 min-h-0">
        <form className="space-y-6">
          {/* Role Toggle */}
          <div className="space-y-3">
            <Label>Role</Label>
            <div className="flex bg-gray-100/80 p-1 rounded-full items-center">
              <button
                type="button"
                onClick={() => setRole("pilot")}
                className={cn(
                  "flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all text-center",
                  role === "pilot"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Pilot
              </button>
              <button
                type="button"
                onClick={() => setRole("crew")}
                className={cn(
                  "flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all text-center",
                  role === "crew"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Crew
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName" 
              value={firstName} 
              onChange={(e) => {
                setFirstName(sanitizeName(e.target.value));
              }} 
              className="rounded-2xl py-6" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">
              Middle Name <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input 
              id="middleName" 
              value={middleName} 
              onChange={(e) => {
                setMiddleName(sanitizeName(e.target.value));
              }} 
              className="rounded-2xl py-6" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName" 
              value={lastName} 
              onChange={(e) => {
                setLastName(sanitizeName(e.target.value));
              }} 
              className="rounded-2xl py-6" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              className="w-full flex items-center justify-between border border-input rounded-2xl py-6 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <span className="text-gray-900 flex items-center gap-2">
                {selectedCountry ? (
                  <>
                    <img 
                      src={`https://flagcdn.com/w20/${selectedCountry}.png`} 
                      srcSet={`https://flagcdn.com/w40/${selectedCountry}.png 2x`} 
                      width="20" 
                      alt="" 
                      className="rounded-[2px] shadow-sm"
                    />
                    {COUNTRIES.find(c => c.id === selectedCountry)?.label}
                  </>
                ) : (
                  "Select Nationality"
                )}
              </span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentEmployer">Current Employer</Label>
            <Input 
              id="currentEmployer" 
              value={currentEmployer} 
              onChange={(e) => setCurrentEmployer(e.target.value)} 
              className="rounded-2xl py-6" 
              placeholder="E.g. Delta Airlines"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalFlightHours">Total Flight Hours</Label>
            <Input 
              id="totalFlightHours" 
              type="number"
              min="0"
              value={totalFlightHours} 
              onChange={(e) => setTotalFlightHours(e.target.value)} 
              className="rounded-2xl py-6" 
              placeholder="E.g. 1500"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Personal Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] rounded-2xl resize-none"
              placeholder="Brief profile description (max 2000 chars)"
              maxLength={2000}
              required
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="font-semibold text-gray-900">Profile Photo</Label>

            <div className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-3xl bg-gray-50/50">
              {/* Circular Avatar — input INSIDE label for direct click */}
              <label 
                className="w-28 h-28 rounded-full bg-[#1e293b] flex items-center justify-center relative overflow-hidden shadow-sm transition-all cursor-pointer hover:opacity-90 border-2 border-transparent hover:border-[#1d4ed8]"
                title="Click to upload photo"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white stroke-[1.5]" />
                )}
              </label>

              {/* Camera & Gallery Buttons — each with inline invisible input */}
              <div className="flex items-center gap-3 mt-4 w-full max-w-xs justify-center">
                <label
                  className="relative flex-1 py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98] select-none text-center overflow-hidden"
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Camera</span>
                </label>

                <label
                  className="relative flex-1 py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98] select-none text-center overflow-hidden"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Gallery</span>
                </label>
              </div>

              <p className="text-xs text-gray-400 mt-2.5 text-center">
                Select a photo from your gallery or take a new one with your camera.
              </p>
            </div>
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 sm:backdrop-blur-none">
        <Button 
          type="button" 
          onClick={handleSave}
          disabled={!firstName || !lastName || !currentEmployer || !totalFlightHours || !description || !photoPreview}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </Button>
      </div>

      <Dialog open={isCountryModalOpen} onOpenChange={setIsCountryModalOpen}>
        <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col bg-white p-0 rounded-3xl overflow-hidden z-[100]">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 text-left">
              Select Country
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search countries..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {filteredCountries.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No countries found.</p>
            ) : (
              <ul className="space-y-1">
                {filteredCountries.map((country) => (
                  <li key={country.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country.id);
                        setIsCountryModalOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors text-left"
                    >
                      <span className="text-gray-900 text-sm font-medium flex items-center gap-3">
                        <img 
                          src={`https://flagcdn.com/w20/${country.id}.png`} 
                          srcSet={`https://flagcdn.com/w40/${country.id}.png 2x`} 
                          width="20" 
                          alt="" 
                          className="rounded-[2px] shadow-sm"
                        />
                        {country.label}
                      </span>
                      {selectedCountry === country.id && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
