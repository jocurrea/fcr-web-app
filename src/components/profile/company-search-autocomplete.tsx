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
  placeholder?: string;
  label?: string;
  className?: string;
  required?: boolean;
}

export function CompanySearchAutocomplete({
  value = "",
  selectedCompanyId = null,
  onSelectCompany,
  placeholder = "Search business or airline...",
  label = "Company / Current Employer",
  className = "",
  required = false,
}: CompanySearchAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySelection | null>(
    value ? { id: selectedCompanyId, name: value, status: selectedCompanyId ? "pending" : "active" } : null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external value changes
  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value);
      if (value) {
        setSelectedCompany({
          id: selectedCompanyId,
          name: value,
          status: selectedCompanyId ? "pending" : "active",
        });
      }
    }
  }, [value, selectedCompanyId, isOpen]);

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

  // Debounced search query function using search_companies_for_affiliation RPC
  const searchCompanies = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let rpcData: any = null;
      let rpcError: any = null;

      // Invoke search_companies_for_affiliation RPC with search text and limit of 20 results
      const res1 = await supabase.rpc("search_companies_for_affiliation", {
        search_query: trimmed,
        result_limit: 20,
      });

      if (!res1.error && res1.data) {
        rpcData = res1.data;
      } else if (res1.error) {
        // Fallback parameter signatures in case of parameter naming differences
        const res2 = await supabase.rpc("search_companies_for_affiliation", {
          search_term: trimmed,
          limit_count: 20,
        });

        if (!res2.error && res2.data) {
          rpcData = res2.data;
        } else {
          const res3 = await supabase.rpc("search_companies_for_affiliation", {
            query: trimmed,
            limit: 20,
          });

          if (!res3.error && res3.data) {
            rpcData = res3.data;
          } else {
            const res4 = await supabase.rpc("search_companies_for_affiliation", {
              search_term: trimmed,
              limit: 20,
            });

            if (!res4.error && res4.data) {
              rpcData = res4.data;
            } else {
              rpcError = res1.error;
            }
          }
        }
      }

      if (rpcError) {
        console.warn("RPC search_companies_for_affiliation returned error:", rpcError);
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
      console.error("Exception in search_companies_for_affiliation RPC:", err);
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

  const handleSelectCustomName = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const selection: CompanySelection = {
      id: null,
      name: trimmed,
      status: "unverified",
    };
    setSelectedCompany(selection);
    setIsOpen(false);

    if (onSelectCompany) {
      onSelectCompany(selection);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSelectedCompany(null);
    setResults([]);
    setIsOpen(false);
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
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Company Pending Notice */}
      {selectedCompany && selectedCompany.id && selectedCompany.status === "pending" && (
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
                  onClick={handleSelectCustomName}
                  className="w-full p-2.5 hover:bg-blue-50/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-left group"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1d4ed8] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-800 group-hover:text-[#1d4ed8] truncate transition-colors">
                      Add as Unregistered Company
                    </span>
                    <span className="text-[11px] text-gray-500 truncate">
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
                onClick={handleSelectCustomName}
                className="w-full p-3 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left group active:scale-[0.99] shadow-2xs"
              >
                <div className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-blue-900 truncate">
                    Add as Unregistered Company
                  </span>
                  <span className="text-xs text-blue-700 font-semibold truncate">
                    &quot;{query.trim()}&quot;
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompanySearchAutocomplete;
