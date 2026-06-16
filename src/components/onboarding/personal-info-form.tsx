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
import { Search, Check, ChevronDown, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const COUNTRIES = [
  { id: "ar", label: "AR Argentina" },
  { id: "au", label: "AU Australia" },
  { id: "at", label: "AT Austria" },
  { id: "bh", label: "BH Bahrain" },
  { id: "bd", label: "BD Bangladesh" },
  { id: "be", label: "BE Belgium" },
  { id: "br", label: "BR Brazil" },
  { id: "ca", label: "CA Canada" },
  { id: "cl", label: "CL Chile" },
  { id: "cn", label: "CN China" },
  { id: "co", label: "CO Colombia" },
  { id: "cz", label: "CZ Czech Republic" },
  { id: "dk", label: "DK Denmark" },
  { id: "eg", label: "EG Egypt" },
  { id: "fi", label: "FI Finland" },
  { id: "fr", label: "FR France" },
  { id: "de", label: "DE Germany" },
  { id: "gr", label: "GR Greece" },
  { id: "hu", label: "HU Hungary" },
  { id: "in", label: "IN India" },
  { id: "id", label: "ID Indonesia" },
  { id: "ie", label: "IE Ireland" },
  { id: "il", label: "IL Israel" },
  { id: "it", label: "IT Italy" },
  { id: "jp", label: "JP Japan" },
  { id: "ke", label: "KE Kenya" },
  { id: "kw", label: "KW Kuwait" },
  { id: "my", label: "MY Malaysia" },
  { id: "mx", label: "MX Mexico" },
  { id: "np", label: "NP Nepal" },
  { id: "nl", label: "NL Netherlands" },
  { id: "nz", label: "NZ New Zealand" },
  { id: "ng", label: "NG Nigeria" },
  { id: "no", label: "NO Norway" },
  { id: "om", label: "OM Oman" },
  { id: "pk", label: "PK Pakistan" },
  { id: "pe", label: "PE Peru" },
  { id: "ph", label: "PH Philippines" },
  { id: "pl", label: "PL Poland" },
  { id: "pt", label: "PT Portugal" },
  { id: "qa", label: "QA Qatar" },
  { id: "ro", label: "RO Romania" },
  { id: "ru", label: "RU Russia" },
  { id: "sa", label: "SA Saudi Arabia" },
  { id: "sg", label: "SG Singapore" },
  { id: "za", label: "ZA South Africa" },
  { id: "kr", label: "KR South Korea" },
  { id: "es", label: "ES Spain" },
  { id: "lk", label: "LK Sri Lanka" },
  { id: "se", label: "SE Sweden" },
  { id: "ch", label: "CH Switzerland" },
  { id: "th", label: "TH Thailand" },
  { id: "tr", label: "TR Turkey" },
  { id: "ae", label: "AE United Arab Emirates" },
  { id: "gb", label: "GB United Kingdom" },
  { id: "us", label: "US United States" },
  { id: "ve", label: "VE Venezuela" },
  { id: "vn", label: "VN Vietnam" }
];

interface PersonalInfoFormProps {
  onNext: () => void;
}

export function PersonalInfoForm({ onNext }: PersonalInfoFormProps) {
  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  useEffect(() => {
    const savedPhoto = localStorage.getItem("userProfilePhoto");
    if (savedPhoto) {
      setPhotoPreview(savedPhoto);
    }
  }, []);
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      
      // Convert to Base64 and save to localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem("userProfilePhoto", base64String);
      };
      reader.readAsDataURL(file);
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

  // Load draft from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("onboarding_personal");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.role) setRole(parsed.role);
          if (parsed.selectedCountry) setSelectedCountry(parsed.selectedCountry);
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.middleName) setMiddleName(parsed.middleName);
          if (parsed.lastName) setLastName(parsed.lastName);
          if (parsed.description) setDescription(parsed.description);
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        if (profile.first_name) setFirstName(profile.first_name);
        if (profile.middle_name) setMiddleName(profile.middle_name);
        if (profile.last_name) setLastName(profile.last_name);
        if (profile.avatar_url) setPhotoPreview(profile.avatar_url);
        // Add more mapping if needed
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    // We will save everything at the end of the onboarding flow
    onNext();
  };

  useEffect(() => {
    localStorage.setItem("onboarding_personal", JSON.stringify({
      role, selectedCountry, firstName, middleName, lastName, description
    }));
  }, [role, selectedCountry, firstName, middleName, lastName, description]);

  const filteredCountries = COUNTRIES.filter(country => 
    country.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 h-full mt-6">
      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-2xl py-6" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">
              Middle Name <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="rounded-2xl py-6" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-2xl py-6" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              className="w-full flex items-center justify-between border border-input rounded-2xl py-6 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <span className="text-gray-900">
                {COUNTRIES.find(c => c.id === selectedCountry)?.label || "Select Nationality"}
              </span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Personal Description <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] rounded-2xl resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Upload Photo</Label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
            />
            {photoPreview ? (
              <div className="relative border border-gray-200 rounded-2xl bg-gray-50 h-48 flex items-center justify-center overflow-hidden">
                <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoPreview(null);
                    localStorage.removeItem("userProfilePhoto");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-gray-200 rounded-2xl bg-gray-50 h-48 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 stroke-[1.5]" />
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 sm:backdrop-blur-none">
        <Button 
          type="button" 
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
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
                      <span className="text-gray-900 text-sm font-medium">{country.label}</span>
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
