"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Building2, Check, X, Loader2, AlertCircle, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CompanySearchResult {
  id: string;
  name: string;
  logo_url?: string | null;
  location?: string | null;
  owner_user_id?: string | null;
}

export interface CompanySelection {
  id: string | null;
  name: string;
  status: "pending" | "active" | "unverified";
  logo_url?: string | null;
}

export interface CompanySearchAutocompleteProps {
  value?: string;
  selectedCompanyId?: string | null;
  onSelectCompany?: (company: CompanySelection) => void;
  onAffiliationSaved?: (company: CompanySelection) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  required?: boolean;
}

export function CompanySearchAutocomplete({
  value = "",
  selectedCompanyId = null,
  onSelectCompany,
  onAffiliationSaved,
  placeholder = "Search business or airline...",
  label = "Company / Current Employer",
  className = "",
  required = false,
}: CompanySearchAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [targetUnregisteredName, setTargetUnregisteredName] = useState("");
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySelection | null>(
    value ? { id: selectedCompanyId, name: value, status: selectedCompanyId ? "pending" : "active" } : null
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevValueRef = useRef(value);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Sync ONLY when external value explicitly changes (avoid wiping user query on dropdown close)
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setQuery(value);
      if (value) {
        setSelectedCompany({
          id: selectedCompanyId,
          name: value,
          status: selectedCompanyId ? "pending" : "active",
        });
      }
    }
  }, [value, selectedCompanyId]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query function using search_companies_for_affiliation RPC with resilient direct fallback
  const searchCompanies = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let rpcData: any[] | null = null;

      // 1. Primary: Invoke search_companies_for_affiliation RPC with search_text & result_limit
      const res = await supabase.rpc("search_companies_for_affiliation", {
        search_text: trimmed,
        result_limit: 20,
      });

      if (!res.error && res.data && Array.isArray(res.data) && res.data.length > 0) {
        rpcData = res.data;
      } else {
        if (res.error) {
          console.warn("Notice from search_companies_for_affiliation RPC:", res.error.message);
        }

        // 2. Resilient Fallback: Query active/approved companies directly from public.companies
        const { data: directData, error: directErr } = await supabase
          .from("companies")
          .select("id, name, logo_url, location, owner_user_id, status")
          .in("status", ["active", "approved"])
          .ilike("name", `%${trimmed}%`)
          .limit(20);

        if (!directErr && directData && directData.length > 0) {
          rpcData = directData;
        } else if (res.data && Array.isArray(res.data)) {
          rpcData = res.data;
        }
      }

      if (rpcData && Array.isArray(rpcData)) {
        const mapped: CompanySearchResult[] = rpcData
          .filter((item: any) => item && (item.id || item.company_id) && (item.name || item.company_name))
          .map((item: any) => ({
            id: item.id || item.company_id,
            name: item.name || item.company_name,
            logo_url: item.logo_url || item.logo || item.profileImage || item.avatar_url || null,
            location:
              item.location ||
              (typeof item.city === "string"
                ? [item.city, item.country].filter(Boolean).join(", ")
                : null) ||
              null,
            owner_user_id: item.owner_user_id || item.owner_id || item.user_id || null,
          }));

        setResults(mapped);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Exception in search_companies_for_affiliation:", err);
      // Emergency fallback on network or unexpected exception
      try {
        const { data: directData } = await supabase
          .from("companies")
          .select("id, name, logo_url, location, owner_user_id, status")
          .in("status", ["active", "approved"])
          .ilike("name", `%${trimmed}%`)
          .limit(20);

        if (directData && Array.isArray(directData)) {
          setResults(
            directData.map((item: any) => ({
              id: item.id,
              name: item.name,
              logo_url: item.logo_url || null,
              location: item.location || null,
              owner_user_id: item.owner_user_id || null,
            }))
          );
          return;
        }
      } catch (fallbackErr) {
        console.error("Direct fallback failed:", fallbackErr);
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setQuery(newText);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newText.trim()) {
      setResults([]);
      setIsLoading(false);
      setSelectedCompany(null);
      setTargetUnregisteredName("");
      if (onSelectCompany) {
        onSelectCompany({ id: null, name: "", status: "active" });
      }
      return;
    }

    // 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      searchCompanies(newText);
    }, 300);
  };

  const handleSelectBusiness = (item: CompanySearchResult) => {
    const selection: CompanySelection = {
      id: item.id,
      name: item.name,
      status: "pending", // AC 2: Set status as pending approval
      logo_url: item.logo_url,
    };
    setQuery(item.name);
    setSelectedCompany(selection);
    setIsOpen(false);

    if (onSelectCompany) {
      onSelectCompany(selection);
    }
  };

  // Opens the confirmation modal before selecting unregistered company (saving the exact typed name)
  const handleOpenConfirmModal = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setTargetUnregisteredName(trimmed);
    setIsOpen(false);
    setShowConfirmModal(true);
  };

  // Confirms adding the unregistered company, executes the save RPC, triggers Toast and updates local state
  const handleConfirmAddUnregistered = async () => {
    const trimmed = (targetUnregisteredName || query).trim();
    if (!trimmed) {
      setShowConfirmModal(false);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Execute unregistered affiliation save via RPC
      const res1 = await supabase.rpc("create_unregistered_company_affiliation", {
        company_name: trimmed,
      });

      if (res1.error) {
        const res2 = await supabase.rpc("create_unregistered_company_affiliation", {
          text: trimmed,
        });
        if (res2.error) {
          const res3 = await supabase.rpc("create_unregistered_company_affiliation", {
            name: trimmed,
          });
          if (res3.error) {
            console.warn("Could not save unregistered company via RPC:", res1.error);
          }
        }
      }

      // 2. Persist to local storage cache so profile immediately displays it
      try {
        const savedPersonal = localStorage.getItem("onboarding_personal");
        const parsed = savedPersonal ? JSON.parse(savedPersonal) : {};
        parsed.companyName = trimmed;
        parsed.company = trimmed;
        parsed.companyId = null;
        parsed.companyStatus = "unverified";
        localStorage.setItem("onboarding_personal", JSON.stringify(parsed));
      } catch (e) {
        console.warn("Error updating local storage cache:", e);
      }

      const selection: CompanySelection = {
        id: null,
        name: trimmed,
        status: "unverified",
      };
      setSelectedCompany(selection);
      setQuery(trimmed);
      setShowConfirmModal(false);

      // 3. Show floating success toast
      setShowSuccessToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3500);

      if (onSelectCompany) {
        onSelectCompany(selection);
      }
      if (onAffiliationSaved) {
        onAffiliationSaved(selection);
      }
    } catch (err) {
      console.error("Error saving unregistered company:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setTargetUnregisteredName("");
    setSelectedCompany(null);
    setResults([]);
    setIsOpen(false);
    setShowSuccessToast(false);
    if (onSelectCompany) {
      onSelectCompany({ id: null, name: "", status: "active" });
    }
  };

  return (
    <div className={cn("relative space-y-2", className)} ref={containerRef}>
      {label && (
        <Label htmlFor="company-search-input" className="text-sm font-semibold text-gray-800">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Building2 className="w-5 h-5 text-gray-400" />
        </div>

        <input
          id="company-search-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
              if (results.length === 0) searchCompanies(query);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}

          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Company Pending Notice */}
      {query.trim() && selectedCompany && selectedCompany.id && selectedCompany.status === "pending" && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200/70 px-3 py-1.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-orange-500" />
          <span>Affiliation request will be submitted as <strong>Pending Verification</strong>.</span>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (query.trim().length >= 2 || results.length > 0) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200/90 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Searching registered businesses...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-1.5 divide-y divide-gray-50">
              <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Registered Businesses
              </div>
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectBusiness(item)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-blue-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                      {item.logo_url ? (
                        <img src={item.logo_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {item.name}
                      </span>
                      {item.location && (
                        <span className="text-xs text-gray-500 truncate">
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedCompany?.id === item.id && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </button>
              ))}

              {/* Option to use custom typed name — E01-HU12 (AC 1) */}
              <div className="p-2 bg-gray-50/50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleOpenConfirmModal}
                  className="w-full p-2.5 hover:bg-blue-50/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-left group"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1d4ed8] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-800 group-hover:text-[#1d4ed8] truncate transition-colors">
                      Add as Unregistered Company
                    </span>
                    <span className="text-[11px] text-gray-500 truncate font-semibold">
                      &quot;{query.trim()}&quot;
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3 text-left">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-gray-900">
                  No registered companies found
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Check the spelling and try another company name.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenConfirmModal}
                className="w-full p-3 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left group active:scale-[0.99] shadow-2xs"
              >
                <div className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-blue-900 truncate">
                    Add as Unregistered Company
                  </span>
                  <span className="text-xs text-blue-700 font-bold truncate">
                    &quot;{query.trim()}&quot;
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Unregistered Company Confirmation Modal ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
              Add unregistered company?
            </h3>

            {/* Dynamic descriptive text interpolating user entered company name */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              &quot;<strong>{targetUnregisteredName || query.trim()}</strong>&quot; will appear as a self-reported company without a verified badge.
            </p>

            {/* Bottom buttons: CANCEL and ADD COMPANY */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-wider cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAddUnregistered}
                className="py-2.5 px-6 rounded-full text-xs sm:text-sm font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all uppercase tracking-wider shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ADDING...</span>
                  </>
                ) : (
                  <span>ADD COMPANY</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Floating Toast ── */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm sm:max-w-md bg-white border border-gray-100 rounded-2xl py-3 px-4 sm:px-5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
              Unregistered company added
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
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

export default CompanySearchAutocomplete;
