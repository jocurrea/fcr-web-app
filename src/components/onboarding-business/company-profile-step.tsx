import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { useBusinessOnboarding } from "@/components/onboarding-business/business-onboarding-context";
import { supabase } from "@/lib/supabase";
import {
  isPasteAllowed,
  hasInvalidCharacters,
  RESTRICTED_INPUT_ERROR_MSG,
  CLIPBOARD_RESTRICTED_ERROR_MSG,
} from "@/lib/validation/input-restrictions";
import {
  isValidStrictUrl,
  INVALID_URL_ERROR_MSG,
  hasXssOrInjection,
  XSS_SECURITY_ERROR_MSG,
} from "@/lib/validation/url-validation";
import {
  handleNumericKeyDown,
  sanitizeInteger,
  validateFoundedYear,
} from "@/lib/validation/numeric-rules";

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
  const [logo, setLogo] = useState<string | null>(null);

  const [locationError, setLocationError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [foundedYearError, setFoundedYearError] = useState<string | null>(null);
  const [operatingAreaError, setOperatingAreaError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [fleetError, setFleetError] = useState<string | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onboarding, isLoading, error: loadError, saveProfile } = useBusinessOnboarding();

  useEffect(() => {
    const company = onboarding?.company;
    if (!company) return;

    setCompanyName(company.name || "");
    setLocation(company.location || "");
    setEmail(company.contact_email || "");
    setPhone(company.phone || "");
    setWebsite(company.website || "");
    setFoundedYear(company.founded_year ? String(company.founded_year) : "");
    setDescription(company.description || "");
    setOperatingAreas(company.operating_areas || []);
    setServicesOffered(company.services || []);
    setFleetTypes(company.fleet_types || []);
    setLogo(company.logo_url || null);
  }, [onboarding?.company]);

  const handleNext = async () => {
    if (hasInvalidCharacters(location)) {
      setLocationError(RESTRICTED_INPUT_ERROR_MSG);
      return;
    }
    if (hasInvalidCharacters(operatingAreaInput) || operatingAreas.some(hasInvalidCharacters)) {
      setOperatingAreaError(RESTRICTED_INPUT_ERROR_MSG);
      return;
    }
    if (hasInvalidCharacters(servicesInput) || servicesOffered.some(hasInvalidCharacters)) {
      setServicesError(RESTRICTED_INPUT_ERROR_MSG);
      return;
    }
    if (hasInvalidCharacters(fleetInput) || fleetTypes.some(hasInvalidCharacters)) {
      setFleetError(RESTRICTED_INPUT_ERROR_MSG);
      return;
    }
    if (website.trim()) {
      if (hasXssOrInjection(website.trim())) {
        setWebsiteError(XSS_SECURITY_ERROR_MSG);
        return;
      }
      if (!isValidStrictUrl(website.trim())) {
        setWebsiteError(INVALID_URL_ERROR_MSG);
        return;
      }
    }
    if (foundedYear.trim()) {
      const { isValid, error } = validateFoundedYear(foundedYear);
      if (!isValid && error) {
        setFoundedYearError(error);
        return;
      }
    }

    if (!isFormValid) return;

    setIsSaving(true);
    setError(null);

    const response = await saveProfile({
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
      logo,
    });

    setIsSaving(false);

    if (!response.success) {
      setError(response.error);
      return;
    }

    onNext();
  };

  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isPhoneValid = (val: string) => !val || /^\+?\d+$/.test(val);
  const isFormValid =
    companyName.trim() !== "" &&
    !!logo &&
    location.trim() !== "" &&
    !locationError &&
    !operatingAreaError &&
    !servicesError &&
    !fleetError &&
    !websiteError &&
    (!website.trim() || isValidStrictUrl(website.trim())) &&
    !hasInvalidCharacters(location) &&
    !hasInvalidCharacters(operatingAreaInput) &&
    !hasInvalidCharacters(servicesInput) &&
    !hasInvalidCharacters(fleetInput) &&
    !operatingAreas.some(hasInvalidCharacters) &&
    !servicesOffered.some(hasInvalidCharacters) &&
    !fleetTypes.some(hasInvalidCharacters) &&
    email.trim() !== "" &&
    isEmailValid(email) &&
    isPhoneValid(phone) &&
    !foundedYearError &&
    (foundedYear === "" || validateFoundedYear(foundedYear).isValid) &&
    !isLoading &&
    !isSaving;

  const addPill = (
    input: string, 
    setInput: (val: string) => void, 
    list: string[], 
    setList: (val: string[]) => void,
    setError?: (msg: string | null) => void
  ) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (hasInvalidCharacters(trimmed)) {
      if (setError) setError(RESTRICTED_INPUT_ERROR_MSG);
      return;
    }
    if (!list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
      if (setError) setError(null);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.9 * 1024 * 1024) {
        setErrorMessage("File exceeds 2MB limit.");
        setShowErrorModal(true);
        return;
      }
      try {
        setIsUploadingLogo(true);
        const { uploadToStorage } = await import("@/lib/upload");
        const publicUrl = await uploadToStorage(file, "companies");
        setLogo(publicUrl);
        try {
          localStorage.setItem("userProfilePhoto", publicUrl);
          localStorage.setItem("company_logo", publicUrl);
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("users").update({ profileImage: publicUrl }).eq("id", user.id);
          }
        } catch (e) {}
      } catch (err: any) {
        setErrorMessage(err?.message || "Error uploading logo.");
        setShowErrorModal(true);
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };


  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar p-1 -mx-1 px-1">
        {(error || loadError) && (
          <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error || loadError}
          </div>
        )}
        {isLoading && (
          <div className="mb-4 rounded-3xl border border-gray-100 bg-white p-4 text-sm text-gray-500 shadow-sm">
            Loading company profile...
          </div>
        )}
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
            disabled={isUploadingLogo}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center p-8 border-[1.5px] border-dashed border-gray-300 rounded-[28px] bg-[#f8fafc] hover:bg-gray-50 transition-colors overflow-hidden relative"
          >
            {isUploadingLogo ? (
              <div className="flex flex-col items-center py-4">
                <div className="w-8 h-8 border-2 border-[#2d73f5] border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-gray-500 font-medium">Uploading logo...</p>
              </div>
            ) : logo ? (
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
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">
                Company Name <span className="text-red-500">*</span>
              </label>
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
                onChange={(e) => {
                  const val = e.target.value;
                  setLocation(val);
                  if (hasInvalidCharacters(val)) {
                    setLocationError(RESTRICTED_INPUT_ERROR_MSG);
                  } else if (locationError) {
                    setLocationError(null);
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (!isPasteAllowed(pasted)) {
                    e.preventDefault();
                    setLocationError(CLIPBOARD_RESTRICTED_ERROR_MSG);
                  }
                }}
                placeholder="Miami, Florida, United States"
                className={`w-full px-5 py-[14px] bg-white border ${
                  locationError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"
                } rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
              />
              {locationError && (
                <p className="text-red-500 text-sm mt-1 ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{locationError}</span>
                </p>
              )}
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
                  const cleaned = val.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
                  setPhone(cleaned);
                }}
                placeholder="+13055550198"
                className={`w-full px-5 py-[14px] bg-white border ${phone && !isPhoneValid(phone) ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"} rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
              />
              {phone && !isPhoneValid(phone) && (
                <p className="text-red-500 text-sm mt-1 ml-2">Use digits and one leading + only</p>
              )}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => {
                  const val = e.target.value;
                  setWebsite(val);
                  if (!val.trim()) {
                    setWebsiteError(null);
                  } else if (hasXssOrInjection(val)) {
                    setWebsiteError(XSS_SECURITY_ERROR_MSG);
                  } else if (!isValidStrictUrl(val)) {
                    setWebsiteError(INVALID_URL_ERROR_MSG);
                  } else {
                    setWebsiteError(null);
                  }
                }}
                placeholder="https://www.pilotinsight.com"
                className={`w-full px-5 py-[14px] bg-white border ${
                  websiteError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"
                } rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
              />
              {websiteError && (
                <p className="text-red-500 text-sm mt-1 ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{websiteError}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Founded Year</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={foundedYear}
                onChange={(e) => {
                  const clean = sanitizeInteger(e.target.value);
                  setFoundedYear(clean);
                  const { error } = validateFoundedYear(clean);
                  setFoundedYearError(error);
                }}
                onKeyDown={handleNumericKeyDown}
                onPaste={(e) => {
                  const pasteData = e.clipboardData.getData("text");
                  if (pasteData && !/^\d+$/.test(pasteData.trim())) {
                    e.preventDefault();
                    const sanitized = sanitizeInteger(pasteData);
                    setFoundedYear(sanitized);
                    const { error } = validateFoundedYear(sanitized);
                    setFoundedYearError(
                      error ||
                        (sanitized === ""
                          ? "Only non-negative whole numbers (0 to current year) are allowed."
                          : null)
                    );
                  }
                }}
                placeholder="2018"
                className={`w-full px-5 py-[14px] bg-white border rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow ${
                  foundedYearError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"
                }`}
              />
              {foundedYearError && (
                <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {foundedYearError}
                </p>
              )}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setOperatingAreaInput(val);
                    if (hasInvalidCharacters(val)) {
                      setOperatingAreaError(RESTRICTED_INPUT_ERROR_MSG);
                    } else if (operatingAreaError) {
                      setOperatingAreaError(null);
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (!isPasteAllowed(pasted)) {
                      e.preventDefault();
                      setOperatingAreaError(CLIPBOARD_RESTRICTED_ERROR_MSG);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addPill(operatingAreaInput, setOperatingAreaInput, operatingAreas, setOperatingAreas, setOperatingAreaError)}
                  placeholder="North America"
                  className={`flex-1 px-5 py-[14px] bg-white border ${
                    operatingAreaError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"
                  } rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
                />
                <button 
                  type="button"
                  onClick={() => addPill(operatingAreaInput, setOperatingAreaInput, operatingAreas, setOperatingAreas, setOperatingAreaError)}
                  disabled={!operatingAreaInput.trim() || hasInvalidCharacters(operatingAreaInput) || !!operatingAreaError}
                  className="px-7 py-[14px] bg-[#1a66ff] hover:bg-[#1554d6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition-colors text-[15px]"
                >
                  Add
                </button>
              </div>
              {operatingAreaError && (
                <p className="text-red-500 text-sm mt-1 ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{operatingAreaError}</span>
                </p>
              )}
              {renderPills(operatingAreas, setOperatingAreas)}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Services Offered</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={servicesInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setServicesInput(val);
                    if (hasInvalidCharacters(val)) {
                      setServicesError(RESTRICTED_INPUT_ERROR_MSG);
                    } else if (servicesError) {
                      setServicesError(null);
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (!isPasteAllowed(pasted)) {
                      e.preventDefault();
                      setServicesError(CLIPBOARD_RESTRICTED_ERROR_MSG);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addPill(servicesInput, setServicesInput, servicesOffered, setServicesOffered, setServicesError)}
                  placeholder="Pilot Hiring"
                  className={`flex-1 px-5 py-[14px] bg-white border ${
                    servicesError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"
                  } rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
                />
                <button 
                  type="button"
                  onClick={() => addPill(servicesInput, setServicesInput, servicesOffered, setServicesOffered, setServicesError)}
                  disabled={!servicesInput.trim() || hasInvalidCharacters(servicesInput) || !!servicesError}
                  className="px-7 py-[14px] bg-[#1a66ff] hover:bg-[#1554d6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition-colors text-[15px]"
                >
                  Add
                </button>
              </div>
              {servicesError && (
                <p className="text-red-500 text-sm mt-1 ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{servicesError}</span>
                </p>
              )}
              {renderPills(servicesOffered, setServicesOffered)}
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-800 mb-2 ml-1">Fleet Types</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={fleetInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFleetInput(val);
                    if (hasInvalidCharacters(val)) {
                      setFleetError(RESTRICTED_INPUT_ERROR_MSG);
                    } else if (fleetError) {
                      setFleetError(null);
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (!isPasteAllowed(pasted)) {
                      e.preventDefault();
                      setFleetError(CLIPBOARD_RESTRICTED_ERROR_MSG);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addPill(fleetInput, setFleetInput, fleetTypes, setFleetTypes, setFleetError)}
                  placeholder="Gulfstream"
                  className={`flex-1 px-5 py-[14px] bg-white border ${
                    fleetError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-[#2d73f5] focus:ring-[#2d73f5]"
                  } rounded-[24px] text-[15px] placeholder-gray-400 focus:outline-none focus:ring-1 transition-shadow`}
                />
                <button 
                  type="button"
                  onClick={() => addPill(fleetInput, setFleetInput, fleetTypes, setFleetTypes, setFleetError)}
                  disabled={!fleetInput.trim() || hasInvalidCharacters(fleetInput) || !!fleetError}
                  className="px-7 py-[14px] bg-[#1a66ff] hover:bg-[#1554d6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition-colors text-[15px]"
                >
                  Add
                </button>
              </div>
              {fleetError && (
                <p className="text-red-500 text-sm mt-1 ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fleetError}</span>
                </p>
              )}
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
          {isSaving ? "Saving..." : "Next"}
        </button>
      </div>
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#091124]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowErrorModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Upload Error</h3>
            <p className="text-[14px] text-gray-500 mb-6">{errorMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-full transition-colors flex items-center justify-center text-[15px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
