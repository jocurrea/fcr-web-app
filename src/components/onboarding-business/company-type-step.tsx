"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBusinessOnboarding } from "@/components/onboarding-business/business-onboarding-context";
import {
  Plane,
  GraduationCap,
  Building2,
  Handshake,
  Wrench,
  Briefcase,
  UserSearch,
  Layers,
  Building,
  PlaneTakeoff,
  ShoppingBag,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";

const COMPANY_TYPE_ICONS: Record<string, LucideIcon> = {
  airline_operator: Plane,
  charter_company: Building2,
  flight_school: GraduationCap,
  fbo: Handshake,
  mro_maintenance: Wrench,
  ground_handling: Briefcase,
  aviation_recruitment: UserSearch,
  training_center: GraduationCap,
  aviation_technology: Layers,
  airport_services: Building,
  aircraft_management: PlaneTakeoff,
  aircraft_sales_brokerage: Handshake,
  aviation_retail: ShoppingBag,
  other: MoreHorizontal,
};

interface CompanyTypeStepProps {
  onNext: () => void;
}

export function CompanyTypeStep({ onNext }: CompanyTypeStepProps) {
  const { onboarding, isLoading, error: loadError, saveTypes } = useBusinessOnboarding();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyTypes = onboarding?.companyTypes ?? [];

  useEffect(() => {
    setSelectedTypes(onboarding?.selectedCompanyTypeKeys ?? []);
  }, [onboarding?.selectedCompanyTypeKeys]);

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);
  const canContinue = selectedTypes.length > 0 && !isLoading && !isSaving;

  const toggleType = (key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((typeKey) => typeKey !== key) : [...prev, key]
    );
  };

  const handleNext = async () => {
    if (!canContinue) return;
    setIsSaving(true);
    setError(null);

    const response = await saveTypes(selectedTypes);
    setIsSaving(false);

    if (!response.success) {
      setError(response.error);
      return;
    }

    onNext();
  };

  return (
    <div className="flex flex-col flex-1 h-full mt-2">
      <div className="mb-4">
        <p className="text-sm font-bold text-gray-900">Select all that apply</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 sm:pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1">
        {isLoading && (
          <div className="rounded-3xl border border-gray-100 bg-white p-4 text-sm text-gray-500 shadow-sm">
            Loading company types...
          </div>
        )}

        {!isLoading && (error || loadError) && (
          <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error || loadError}
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3">
            {companyTypes.map((type) => {
              const Icon = COMPANY_TYPE_ICONS[type.key] ?? MoreHorizontal;
              const isSelected = selectedSet.has(type.key);

              return (
                <label
                  key={type.id}
                  onClick={() => toggleType(type.key)}
                  className="flex items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-3xl cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center text-gray-700">
                      <Icon className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <span className="text-[16px] text-gray-900 font-bold">{type.label}</span>
                  </div>
                  <div
                    className={cn(
                      "w-6 h-6 rounded border flex items-center justify-center transition-colors",
                      isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-4 sm:backdrop-blur-none">
        <Button
          type="button"
          onClick={handleNext}
          disabled={!canContinue}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Next"}
        </Button>
      </div>
    </div>
  );
}
