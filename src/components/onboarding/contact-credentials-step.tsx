"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, AlertCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { WorkAvailabilityStatus } from "@/components/profile/work-availability-status";
import { CompanySearchAutocomplete, type CompanySelection } from "@/components/profile/company-search-autocomplete";

interface ContactCredentialsStepProps {
  onNext?: (data: { email: string; phone: string; licenseCertification: string; licenses?: string[] }) => void;
  onBack?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{7,25}$/;
const MAX_LICENSES = 20;

export function ContactCredentialsStep({ onNext, onBack }: ContactCredentialsStepProps) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentLicenseInput, setCurrentLicenseInput] = useState("");
  const [licensesList, setLicensesList] = useState<string[]>([]);
  const [companySelection, setCompanySelection] = useState<CompanySelection | null>(null);
  const [touched, setTouched] = useState({ email: false, phone: false, license: false });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const savedPersonal = localStorage.getItem("onboarding_personal");
        if (savedPersonal) {
          const parsed = JSON.parse(savedPersonal);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.licenseCertification) {
            setCurrentLicenseInput(parsed.licenseCertification);
          }
          if (Array.isArray(parsed.licenses) && parsed.licenses.length > 0) {
            setLicensesList(parsed.licenses);
          } else if (parsed.licenseCertification) {
            setLicensesList([parsed.licenseCertification]);
          }

          // Local draft fallback for company selection
          if (parsed.linkedCompany || parsed.companyName) {
            setCompanySelection({
              id: parsed.linkedCompanyId || null,
              name: parsed.linkedCompany || parsed.companyName || "",
              status: parsed.companyLinkStatus || (parsed.linkedCompanyId ? "pending" : "active"),
              logo_url: parsed.linkedCompanyLogo || null,
            });
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email && !email) {
          setEmail(session.user.email);
        }

        // Load company affiliation from get_my_profile RPC
        if (session?.user) {
          try {
            const { data: profileRpc } = await supabase.rpc("get_my_profile");
            if (profileRpc) {
              const aff =
                profileRpc.affiliation ||
                profileRpc.company_affiliation ||
                (Array.isArray(profileRpc.affiliations) ? profileRpc.affiliations[0] : null) ||
                (profileRpc.company_name || profileRpc.company ? profileRpc : null);

              const compName =
                aff?.company_name ||
                aff?.company?.name ||
                aff?.name ||
                profileRpc.company_name ||
                profileRpc.company?.name;

              const compId =
                aff?.company_id ||
                aff?.company?.id ||
                aff?.id ||
                profileRpc.company_id ||
                null;

              const affStatus =
                aff?.status ||
                aff?.affiliation_status ||
                profileRpc.affiliation_status ||
                profileRpc.company_link_status ||
                (compId ? "pending" : "active");

              if (compName) {
                setCompanySelection({
                  id: compId,
                  name: compName,
                  status: affStatus === "pending" ? "pending" : "active",
                  logo_url: aff?.logo_url || aff?.company?.logo_url || null,
                });
              }
            }
          } catch (rpcErr) {
            console.warn("Could not load affiliation from get_my_profile:", rpcErr);
          }
        }
      } catch (e) {
        console.error("Error reading saved contact data:", e);
      }
    }
    loadInitialData();
  }, []);

  // License addition helper
  const handleAddLicense = () => {
    const trimmed = currentLicenseInput.trim();
    if (!trimmed) return;
    if (licensesList.length >= MAX_LICENSES) return;

    if (!licensesList.includes(trimmed)) {
      setLicensesList(prev => [...prev, trimmed]);
    }
    setCurrentLicenseInput("");
    setTouched(prev => ({ ...prev, license: true }));
  };

  const handleRemoveLicense = (indexToRemove: number) => {
    setLicensesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleLicenseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLicense();
    }
  };

  const isEmailEmpty = email.trim().length === 0;
  const isEmailFormatValid = EMAIL_REGEX.test(email.trim());
  const isEmailValid = !isEmailEmpty && isEmailFormatValid;

  const isPhoneEmpty = phone.trim().length === 0;
  const isPhoneFormatValid = PHONE_REGEX.test(phone.trim()) && (phone.match(/\d/g) || []).length >= 7;
  const isPhoneValid = !isPhoneEmpty && isPhoneFormatValid;

  const isLicenseValid = licensesList.length > 0 || currentLicenseInput.trim().length > 0;

  const isFormValid = isEmailValid && isPhoneValid && isLicenseValid;

  const handleNextClick = async () => {
    setTouched({ email: true, phone: true, license: true });

    if (!isFormValid || isSaving) return;

    // Combine any pending typed license with the list
    let finalLicenses = [...licensesList];
    if (currentLicenseInput.trim() && !finalLicenses.includes(currentLicenseInput.trim())) {
      finalLicenses.push(currentLicenseInput.trim());
    }

    const primaryLicense = finalLicenses[0] || "";

    setIsSaving(true);
    try {
      const existing = localStorage.getItem("onboarding_personal");
      const parsed = existing ? JSON.parse(existing) : {};

      const updated = {
        ...parsed,
        email: email.trim(),
        phone: phone.trim(),
        licenseCertification: primaryLicense,
        licenses: finalLicenses,
        category: "aviation_professional",
        role: "aviation_professional",
      };

      localStorage.setItem("onboarding_personal", JSON.stringify(updated));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Save into users table (NO company columns — company handled by RPCs)
        await supabase.from("users").upsert({
          id: session.user.id,
          email: email.trim(),
          phone: phone.trim(),
          accountType: "aviation_professional",
        }, { onConflict: "id" });

        // 2. Save into resumes table (NO company columns in personal)
        const { data: currentResume } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", session.user.id)
          .maybeSingle();

        const resumeData = (currentResume?.data as any) || {};
        const updatedPersonal = {
          ...(resumeData.personal || {}),
          email: email.trim(),
          phone: phone.trim(),
          licenseCertification: primaryLicense,
          category: "aviation_professional",
          role: "aviation_professional",
        };

        const updatedLicenses = finalLicenses.map((lic, idx) => ({
          id: `license-${idx + 1}`,
          name: lic,
          number: "N/A",
          country: "Global"
        }));

        await supabase.from("resumes").upsert({
          userId: session.user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal,
            licenses: updatedLicenses
          }
        }, { onConflict: "userId" });

        // 3. E01-HU11: Company Affiliation via RPCs
        if (companySelection?.name?.trim()) {
          if (companySelection.id) {
            // Registered company (UUID) -> request affiliation with 'pending' status
            const { error: rpcError } = await supabase.rpc("request_company_affiliation", {
              company_id: companySelection.id,
            });
            if (rpcError) {
              console.error("Error calling request_company_affiliation:", rpcError);
            }
          } else {
            // E01-HU12: Unregistered / free-text company -> create unregistered affiliation (AC 2 & AC 3)
            const res1 = await supabase.rpc("create_unregistered_company_affiliation", {
              company_name: companySelection.name.trim(),
            });
            if (res1.error) {
              const res2 = await supabase.rpc("create_unregistered_company_affiliation", {
                text: companySelection.name.trim(),
              });
              if (res2.error) {
                const res3 = await supabase.rpc("create_unregistered_company_affiliation", {
                  name: companySelection.name.trim(),
                });
                if (res3.error) {
                  console.error("Error calling create_unregistered_company_affiliation:", res1.error);
                }
              }
            }
          }
        }
      }

      if (onNext) {
        onNext({
          email: email.trim(),
          phone: phone.trim(),
          licenseCertification: primaryLicense,
          licenses: finalLicenses
        });
      } else {
        router.push("/onboarding-complete");
      }
    } catch (err) {
      console.error("Error saving contact and credentials:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const totalLicensesCount = licensesList.length + (currentLicenseInput.trim() && !licensesList.includes(currentLicenseInput.trim()) ? 1 : 0);

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

        {/* 2. Title, 6-Segment Progress Bar (4 segments blue), Subtitle & Description */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Contact & Credentials
          </h1>

          {/* 6-Segment Progress Bar: Segments 1, 2, 3 & 4 blue, 5 & 6 gray */}
          <div className="grid grid-cols-6 gap-2 w-full my-3.5">
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-[#1d4ed8]" />
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div className="h-1.5 rounded-full bg-gray-200" />
          </div>

          <h2 className="text-base font-bold text-gray-900 mt-1">
            Add your contact and credentials
          </h2>

          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Share professional contact details and the licenses or certifications relevant to your aviation work.
          </p>
        </div>

        {/* 3. Form Fields in exact mobile order */}
        <div className="flex flex-col gap-5 flex-1">
          
          {/* Field 1: Phone (Ordered First) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="phone" className="font-semibold text-gray-900 text-sm">
                Phone <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
              placeholder="e.g., +1 (555) 234-5678"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.phone && !isPhoneValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
            {touched.phone && isPhoneEmpty && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field is required.
              </p>
            )}
            {touched.phone && !isPhoneEmpty && !isPhoneFormatValid && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Please enter a valid phone number.
              </p>
            )}
          </div>

          {/* Field 2: Contact email (Ordered Second) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="font-semibold text-gray-900 text-sm">
                Contact email <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              placeholder="e.g., alexander.wright@example.com"
              className={cn(
                "w-full rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                touched.email && !isEmailValid
                  ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                  : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              )}
            />
            {/* Helper text below Contact email */}
            <p className="text-xs text-gray-400 mt-0.5 px-0.5">
              This is your public professional email, not your login setting.
            </p>

            {touched.email && isEmailEmpty && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field is required.
              </p>
            )}
            {touched.email && !isEmailEmpty && !isEmailFormatValid && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Please enter a valid email address.
              </p>
            )}
          </div>

          {/* Field 3: Licenses / Certifications with Top Counter and Circular (+) Add Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <Label htmlFor="licenseCertification" className="font-semibold text-gray-900 text-sm">
                Licenses / Certifications <span className="text-red-500">*</span>
              </Label>

              {/* Counter aligned to the right on the same row as the label */}
              <span
                className={cn(
                  "text-xs font-medium",
                  totalLicensesCount >= MAX_LICENSES
                    ? "text-amber-600 font-bold"
                    : "text-gray-400"
                )}
              >
                {totalLicensesCount} / {MAX_LICENSES}
              </span>
            </div>

            {/* Input and External (+) Circular Blue Add Button */}
            <div className="flex items-center gap-3">
              <Input
                id="licenseCertification"
                type="text"
                value={currentLicenseInput}
                onChange={(e) => setCurrentLicenseInput(e.target.value)}
                onKeyDown={handleLicenseKeyDown}
                onBlur={() => setTouched(prev => ({ ...prev, license: true }))}
                placeholder="e.g. A&P Certificate"
                className={cn(
                  "flex-1 rounded-2xl py-6 px-4 text-sm bg-white border transition-all",
                  touched.license && !isLicenseValid
                    ? "border-red-400 ring-1 ring-red-200/50 bg-red-50/10 focus:border-red-500 focus:ring-red-300"
                    : "border-gray-200 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                )}
              />

              {/* Circular blue button with white plus icon */}
              <button
                type="button"
                onClick={handleAddLicense}
                className="shrink-0 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Add license"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Added Licenses Badges List */}
            {licensesList.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {licensesList.map((lic, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#1d4ed8] text-xs font-semibold shadow-2xs animate-in fade-in"
                  >
                    <span>{lic}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLicense(idx)}
                      className="w-4 h-4 rounded-full hover:bg-blue-200/70 text-blue-500 hover:text-blue-800 flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {touched.license && !isLicenseValid && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field is required.
              </p>
            )}
          </div>

          {/* Field 4: Company / Current Employer Autocomplete (AC 1) */}
          <div className="pt-1">
            <CompanySearchAutocomplete
              value={companySelection?.name || ""}
              selectedCompanyId={companySelection?.id || null}
              onSelectCompany={(selection) => setCompanySelection(selection)}
              label="Company / Current Employer"
              placeholder="Search business or airline..."
              required={false}
            />
          </div>

        </div>

        {/* 4. Bottom Next Button */}
        <div className="pb-8 pt-4">
          <button
            type="button"
            onClick={handleNextClick}
            disabled={!isFormValid || isSaving}
            className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
              isFormValid && !isSaving
                ? "bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer"
                : "bg-[#85b0fa] cursor-not-allowed opacity-90"
            }`}
          >
            {isSaving ? "Please wait..." : "Next"}
          </button>
        </div>

      </div>
    </div>
  );
}
