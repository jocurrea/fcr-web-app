import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CompanyProfileStepProps {
  onNext: () => void;
}

export function CompanyProfileStep({ onNext }: CompanyProfileStepProps) {
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [description, setDescription] = useState("");
  
  const [operatingAreaInput, setOperatingAreaInput] = useState("");
  const [operatingAreas, setOperatingAreas] = useState<string[]>([]);

  const [servicesInput, setServicesInput] = useState("");
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);

  const [fleetInput, setFleetInput] = useState("");
  const [fleetTypes, setFleetTypes] = useState<string[]>([]);

  // Load existing data if any
  useEffect(() => {
    let storedEmail = "";
    const saved = localStorage.getItem("business_profile");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.location) setLocation(data.location);
        if (data.email) {
          setEmail(data.email);
          storedEmail = data.email;
        }
        if (data.phone) setPhone(data.phone);
        if (data.website) setWebsite(data.website);
        if (data.foundedYear) setFoundedYear(data.foundedYear);
        if (data.description) setDescription(data.description);
        if (data.operatingAreas) setOperatingAreas(data.operatingAreas);
        if (data.servicesOffered) setServicesOffered(data.servicesOffered);
        if (data.fleetTypes) setFleetTypes(data.fleetTypes);
        if (data.logo) setLogo(data.logo);
      } catch(e) {}
    }

    if (!storedEmail) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setEmail(user.email);
        }
      });
    }
  }, []);

  const handleNext = () => {
    localStorage.setItem("business_profile", JSON.stringify({
      companyName,
      location,
      email,
      phone,
      website,
      foundedYear,
      description,
      operatingAreas,
      servicesOffered,
      fleetTypes,
      logo
    }));
    onNext();
  };

  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isFormValid = companyName.trim() !== "" && location.trim() !== "" && email.trim() !== "" && isEmailValid(email);

  const addPill = (
    input: string, 
    setInput: (val: string) => void, 
    list: string[], 
    setList: (val: string[]) => void
  ) => {
    if (input.trim() && !list.includes(input.trim())) {
      setList([...list, input.trim()]);
      setInput("");
    }
  };

  const removePill = (itemToRemove: string, list: string[], setList: (val: string[]) => void) => {
    setList(list.filter(item => item !== itemToRemove));
  };

  const renderPills = (list: string[], setList: (val: string[]) => void) => {
    if (list.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3 ml-1">
        {list.map(item => (
          <div key={item} className="flex items-center bg-[#eef4ff] text-[#2d73f5] px-4 py-2 rounded-full text-[14px] font-medium">
            {item}
            <button onClick={() => removePill(item, list, setList)} className="ml-2 hover:text-[#1554d6]">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const [logo, setLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Maximum size is 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ... (dentro del componente se usará setLogo en useEffect y handleNext)

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar p-1 -mx-1 px-1">
        {/* Logo Section */}
        <div className="mb-8 mt-4">
          <h2 className="font-bold text-base text-gray-900 mb-3">Logo</h2>
          <input
            type="file"
            accept="image/jpeg, image/png, image/svg+xml"
            className="hidden"
            ref={fileInputRef}
            onChange={handleLogoUpload}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center p-8 border-[1.5px] border-dashed border-gray-300 rounded-[28px] bg-[#f8fafc] hover:bg-gray-50 transition-colors overflow-hidden relative"
          >
            {logo ? (
              <img src={logo} alt="Company Logo" className="w-full h-full object-contain absolute inset-0 p-2" />
            ) : (
              <>
                <div className="w-14 h-14 bg-[#f0f5ff] rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-[#2d73f5]" />
                </div>
                <h3 className="font-bold text-[15px] text-gray-900 mb-1">Tap to upload</h3>
                <p className="text-[13px] text-gray-500">JPG, PNG or SVG (max 2MB)</p>
              </>
            )}
          </button>
        </div>

        {/* Company Information Section */}
        <div>
          <h2 className="font-bold text-base text-gray-900 mb-5">Company Information</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Pilot Insight Aviation"
                className="w-full px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Location / Headquarters</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Miami, Florida, United States"
                className="w-full px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Company Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@pilotinsight.com"
                className={`w-full px-5 py-[14px] bg-white border ${email && !isEmailValid(email) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]'} rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
              />
              {email && !isEmailValid(email) && (
                <p className="text-red-500 text-sm mt-1 ml-2">Please enter a valid email address</p>
              )}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  // Permitir solo números y opcionalmente el signo + al principio
                  const onlyNums = val.replace(/[^\d+]/g, '');
                  setPhone(onlyNums);
                }}
                placeholder="+13055550198"
                className="w-full px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.pilotinsight.com"
                className="w-full px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Founded Year</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={foundedYear}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFoundedYear(val);
                }}
                placeholder="2018"
                className="w-full px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 ml-1 mr-1">
                <label className="block text-[14px] font-semibold text-gray-800">Company Description</label>
                <span className="text-[13px] text-gray-500">{description.length}/500</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setDescription(e.target.value);
                }}
                placeholder="Describe your company"
                rows={5}
                className="w-full px-5 py-4 bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow resize-none"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Operating Areas</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={operatingAreaInput}
                  onChange={(e) => setOperatingAreaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPill(operatingAreaInput, setOperatingAreaInput, operatingAreas, setOperatingAreas)}
                  placeholder="North America"
                  className="flex-1 px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
                />
                <button 
                  type="button"
                  onClick={() => addPill(operatingAreaInput, setOperatingAreaInput, operatingAreas, setOperatingAreas)}
                  className="px-7 py-[14px] bg-[#1a66ff] hover:bg-[#1554d6] text-white font-bold rounded-full transition-colors text-[15px]"
                >
                  Add
                </button>
              </div>
              {renderPills(operatingAreas, setOperatingAreas)}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Services Offered</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={servicesInput}
                  onChange={(e) => setServicesInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPill(servicesInput, setServicesInput, servicesOffered, setServicesOffered)}
                  placeholder="Pilot Hiring"
                  className="flex-1 px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
                />
                <button 
                  type="button"
                  onClick={() => addPill(servicesInput, setServicesInput, servicesOffered, setServicesOffered)}
                  className="px-7 py-[14px] bg-[#1a66ff] hover:bg-[#1554d6] text-white font-bold rounded-full transition-colors text-[15px]"
                >
                  Add
                </button>
              </div>
              {renderPills(servicesOffered, setServicesOffered)}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Fleet Types</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={fleetInput}
                  onChange={(e) => setFleetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPill(fleetInput, setFleetInput, fleetTypes, setFleetTypes)}
                  placeholder="Gulfstream"
                  className="flex-1 px-5 py-[14px] bg-white border border-gray-300 rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:border-[#2d73f5] focus:ring-1 focus:ring-[#2d73f5] transition-shadow"
                />
                <button 
                  type="button"
                  onClick={() => addPill(fleetInput, setFleetInput, fleetTypes, setFleetTypes)}
                  className="px-7 py-[14px] bg-[#1a66ff] hover:bg-[#1554d6] text-white font-bold rounded-full transition-colors text-[15px]"
                >
                  Add
                </button>
              </div>
              {renderPills(fleetTypes, setFleetTypes)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 pb-8 mt-auto bg-white border-t border-transparent">
        <button
          onClick={handleNext}
          disabled={!isFormValid}
          className="w-full py-4 rounded-full font-bold text-white transition-colors bg-[#2d73f5] hover:bg-[#2d73f5]/90 disabled:bg-[#85b0fa] disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
