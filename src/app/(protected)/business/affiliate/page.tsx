"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CompanySearchAutocomplete, type CompanySelection } from "@/components/profile/company-search-autocomplete";
import { cn } from "@/lib/utils";

export default function BusinessAffiliatePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAffiliation, setCurrentAffiliation] = useState<{
    companyName: string | null;
    companyId: string | null;
    status: "pending" | "active" | "verified" | "unverified" | null;
  } | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<CompanySelection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load existing affiliation status
  useEffect(() => {
    async function loadCurrentAffiliation() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        // Fetch user profile via RPC or direct tables
        const { data: profileData, error: profileErr } = await supabase.rpc("get_my_profile");

        if (!profileErr && profileData) {
          const profile = Array.isArray(profileData) ? profileData[0] : profileData;
          if (profile?.company_name || profile?.companyName) {
            const rawStatus = (profile.affiliation_status || profile.affiliationStatus || "unverified").toLowerCase();
            const status: "pending" | "active" | "verified" | "unverified" =
              rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified"
                ? "verified"
                : rawStatus === "pending"
                ? "pending"
                : "unverified";

            setCurrentAffiliation({
              companyName: profile.company_name || profile.companyName,
              companyId: profile.company_id || profile.companyId || null,
              status,
            });
          }
        } else {
          // Fallback: Check local storage
          const savedPersonal = localStorage.getItem("onboarding_personal");
          if (savedPersonal) {
            const parsed = JSON.parse(savedPersonal);
            if (parsed.companyName || parsed.company) {
              setCurrentAffiliation({
                companyName: parsed.companyName || parsed.company,
                companyId: parsed.companyId || null,
                status: parsed.companyStatus || "unverified",
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading affiliation details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentAffiliation();
  }, [router]);

  const handleSelectCompany = (selection: CompanySelection) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (selection.name.trim()) {
      setSelectedCompany(selection);
    } else {
      setSelectedCompany(null);
    }
  };

  const handleAffiliationSaved = (selection: CompanySelection) => {
    setSelectedCompany(selection);
    setSuccessMessage(`Unregistered company "${selection.name}" added successfully.`);
    setTimeout(() => {
      router.push("/profile");
    }, 1200);
  };

  const handleButtonClick = () => {
    if (!selectedCompany || !selectedCompany.name.trim()) return;
    if (!selectedCompany.id) {
      // Prompt confirmation modal for unregistered company
      setShowConfirmModal(true);
    } else {
      executeAffiliationSubmit();
    }
  };

  const executeAffiliationSubmit = async () => {
    if (!selectedCompany || !selectedCompany.name.trim()) {
      setErrorMessage("Please select or enter a company name.");
      return;
    }

    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      if (selectedCompany.id) {
        // 1. Registered Business Account -> request official affiliation (pending review)
        const { error: rpcErr } = await supabase.rpc("request_company_affiliation", {
          company_id: selectedCompany.id,
        });

        if (rpcErr) {
          console.error("Error calling request_company_affiliation:", rpcErr);
          setErrorMessage(rpcErr.message || "Failed to submit affiliation request. Please try again.");
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage(`Affiliation request sent to ${selectedCompany.name}! Awaiting review by company administrator.`);
      } else {
        // 2. Unregistered / Free-text Company -> E01-HU12: create unregistered affiliation
        const res1 = await supabase.rpc("create_unregistered_company_affiliation", {
          company_name: selectedCompany.name.trim(),
        });

        if (res1.error) {
          const res2 = await supabase.rpc("create_unregistered_company_affiliation", {
            text: selectedCompany.name.trim(),
          });
          if (res2.error) {
            const res3 = await supabase.rpc("create_unregistered_company_affiliation", {
              name: selectedCompany.name.trim(),
            });
            if (res3.error) {
              console.error("Error calling create_unregistered_company_affiliation:", res1.error);
              setErrorMessage(res1.error.message || "Failed to save company affiliation.");
              setIsSubmitting(false);
              return;
            }
          }
        }

        setSuccessMessage(`Company affiliation saved as "${selectedCompany.name}".`);
      }

      // Update local storage cache
      try {
        const savedPersonal = localStorage.getItem("onboarding_personal");
        const parsed = savedPersonal ? JSON.parse(savedPersonal) : {};
        parsed.companyName = selectedCompany.name.trim();
        parsed.companyId = selectedCompany.id;
        parsed.companyStatus = selectedCompany.id ? "pending" : "unverified";
        localStorage.setItem("onboarding_personal", JSON.stringify(parsed));
      } catch (e) {
        console.warn("Local storage cache update error:", e);
      }

      // Smooth redirection back to profile
      setTimeout(() => {
        router.push("/profile");
      }, 1200);
    } catch (err: any) {
      console.error("Affiliation submission error:", err);
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl min-h-[100dvh] flex flex-col px-4 sm:px-6 py-6 justify-between">
        
        {/* Top Navigation & Header */}
        <div className="flex flex-col gap-5">
          {/* Top Bar: Left Back Button + Subtle Title */}
          <div className="relative flex items-center justify-center w-full pt-1 pb-2 min-h-[44px]">
            <button
              type="button"
              onClick={() => router.back()}
              className="absolute left-0 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50 cursor-pointer z-10"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>

            <img
              src="/img/FCRlogo2.png"
              alt="Flight Crew Ranked"
              className="w-[180px] sm:w-[210px] h-auto object-contain"
            />
          </div>

          {/* Section Title & Description */}
          <div className="space-y-1.5 pt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              Link your employer
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Search for your airline or aviation company to link your profile, or enter an unregistered business name.
            </p>
          </div>

          {/* Current Affiliation Status (if any) */}
          {!isLoading && currentAffiliation?.companyName && (
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    Current affiliation
                  </span>
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {currentAffiliation.companyName}
                  </span>
                </div>
              </div>

              {currentAffiliation.status === "verified" ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : currentAffiliation.status === "pending" ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-xs font-medium whitespace-nowrap">
                  Self-declared
                </span>
              )}
            </div>
          )}

          {/* Company Search & Autocomplete */}
          <div className="space-y-3 pt-1">
            <CompanySearchAutocomplete
              label="Company or Airline Name"
              placeholder="Search business or airline..."
              value={selectedCompany?.name || ""}
              selectedCompanyId={selectedCompany?.id || null}
              onSelectCompany={handleSelectCompany}
              onAffiliationSaved={handleAffiliationSaved}
              required={false}
            />

            {/* Selected Company Feedback Box — Highlighted Blue Border for Unregistered Company */}
            {selectedCompany && selectedCompany.name.trim() && (
              <div
                className={cn(
                  "p-4 sm:p-5 rounded-3xl transition-all shadow-xs flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150",
                  !selectedCompany.id
                    ? "border-2 border-[#1d4ed8] bg-blue-50/50 shadow-sm"
                    : "border border-blue-200 bg-white shadow-2xs"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs transition-colors",
                      !selectedCompany.id
                        ? "bg-[#1d4ed8] text-white"
                        : "bg-blue-50 text-[#1d4ed8] border border-blue-100"
                    )}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-gray-900 truncate">
                        {selectedCompany.name}
                      </span>
                      {!selectedCompany.id && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#1d4ed8] uppercase tracking-wider shrink-0">
                          Unregistered
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-medium leading-relaxed mt-0.5">
                      {selectedCompany.id ? (
                        <span className="flex items-center gap-1 text-blue-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          Official business account — Request will be sent for review.
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          Self-declared affiliation — No approval required.
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Button: Dynamic Request Affiliation vs Add Unregistered Company */}
        <div className="pb-8 pt-6">
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={!selectedCompany || !selectedCompany.name.trim() || isSubmitting}
            className={cn(
              "w-full py-4 rounded-full font-bold text-sm sm:text-base text-white transition-all shadow-md flex items-center justify-center gap-2 select-none",
              selectedCompany && selectedCompany.name.trim() && !isSubmitting
                ? "bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer active:scale-[0.98]"
                : "bg-[#85b0fa] cursor-not-allowed opacity-80"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing affiliation...</span>
              </>
            ) : selectedCompany && !selectedCompany.id ? (
              <span>Add unregistered company</span>
            ) : (
              <span>Request affiliation</span>
            )}
          </button>
        </div>

      </div>

      {/* ── Unregistered Company Confirmation Modal ── */}
      {showConfirmModal && selectedCompany && !selectedCompany.id && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
              Add unregistered company?
            </h3>

            {/* Dynamic descriptive text with user typed text */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              <strong>&quot;{selectedCompany.name}&quot;</strong> will appear as a self-reported company without a verified badge.
            </p>

            {/* Bottom buttons: CANCEL and ADD COMPANY */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-wider cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={executeAffiliationSubmit}
                className="py-2.5 px-6 rounded-full text-xs sm:text-sm font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all uppercase tracking-wider shadow-md active:scale-95 cursor-pointer"
              >
                ADD COMPANY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Floating Toast ── */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm sm:max-w-md bg-white border border-gray-100 rounded-2xl py-3 px-4 sm:px-5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                {selectedCompany && !selectedCompany.id
                  ? "Unregistered company added"
                  : "Affiliation request sent"}
              </span>
              <span className="text-[11px] text-gray-500 truncate font-medium">
                {selectedCompany?.name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
