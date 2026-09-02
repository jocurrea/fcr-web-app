"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchBusinessOnboarding,
  saveCompanyProfile,
  saveCompanySettings,
  saveCompanyTypeSelections,
  submitBusinessOnboarding,
  type BusinessOnboardingData,
  type CommunityVisibilityInput,
  type CompanyProfileInput,
  type CompanyRow,
} from "@/lib/api/business";

type BusinessOnboardingContextValue = {
  onboarding: BusinessOnboardingData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveTypes: (companyTypeKeys: string[], otherTypeText?: string) => Promise<{ success: true } | { success: false; error: string }>;
  saveProfile: (profile: CompanyProfileInput) => Promise<{ success: true } | { success: false; error: string }>;
  saveVisibility: (visibility: CommunityVisibilityInput) => Promise<{ success: true } | { success: false; error: string }>;
  submit: () => Promise<{ success: true } | { success: false; error: string }>;
};

const BusinessOnboardingContext = createContext<BusinessOnboardingContextValue | null>(null);

function toSettings(visibility: CommunityVisibilityInput) {
  return {
    interested_in_advertising: visibility.advertising,
    interested_in_hiring_pilots: visibility.hiringPilots,
    interested_in_hiring_cabin_crew: visibility.hiringCabinCrew,
    offers_crew_discounts: visibility.offerDiscounts,
    join_founding_partners: visibility.joinFounding,
    allow_crew_direct_messages: visibility.allowDMs,
  };
}

export function BusinessOnboardingProvider({ children }: { children: ReactNode }) {
  const [onboarding, setOnboarding] = useState<BusinessOnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetchBusinessOnboarding();

    if (!response.success) {
      setError(response.error);
      setIsLoading(false);
      return;
    }

    setOnboarding(response.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveTypes = useCallback(async (companyTypeKeys: string[], otherTypeText?: string) => {
    const response = await saveCompanyTypeSelections(companyTypeKeys, otherTypeText);

    if (!response.success) {
      return { success: false as const, error: response.error };
    }

    setOnboarding((current) =>
      current
        ? {
            ...current,
            company: response.data,
            selectedCompanyTypeKeys: companyTypeKeys,
            otherTypeText: otherTypeText?.trim() || "",
          }
        : current,
    );

    return { success: true as const };
  }, []);

  const saveProfile = useCallback(async (profile: CompanyProfileInput) => {
    const response = await saveCompanyProfile(profile);

    if (!response.success) {
      return { success: false as const, error: response.error };
    }

    setOnboarding((current) =>
      current
        ? {
            ...current,
            company: response.data,
          }
        : current,
    );

    return { success: true as const };
  }, []);

  const saveVisibility = useCallback(async (visibility: CommunityVisibilityInput) => {
    const response = await saveCompanySettings(visibility);

    if (!response.success) {
      return { success: false as const, error: response.error };
    }

    setOnboarding((current) =>
      current
        ? {
            ...current,
            settings: toSettings(visibility),
          }
        : current,
    );

    return { success: true as const };
  }, []);

  const submit = useCallback(async () => {
    if (!onboarding) {
      return { success: false as const, error: "Business onboarding is still loading." };
    }

    const response = await submitBusinessOnboarding(onboarding);

    if (!response.success) {
      return { success: false as const, error: response.error };
    }

    setOnboarding((current) =>
      current
        ? {
            ...current,
            company: response.data as CompanyRow,
          }
        : current,
    );

    return { success: true as const };
  }, [onboarding]);

  const value = useMemo(
    () => ({
      onboarding,
      isLoading,
      error,
      reload,
      saveTypes,
      saveProfile,
      saveVisibility,
      submit,
    }),
    [error, isLoading, onboarding, reload, saveProfile, saveTypes, saveVisibility, submit],
  );

  return <BusinessOnboardingContext.Provider value={value}>{children}</BusinessOnboardingContext.Provider>;
}

export function useBusinessOnboarding() {
  const context = useContext(BusinessOnboardingContext);

  if (!context) {
    throw new Error("useBusinessOnboarding must be used within BusinessOnboardingProvider");
  }

  return context;
}
