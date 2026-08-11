import { supabase } from "@/lib/supabase";

export type CompanyType = {
  id: string;
  key: string;
  label: string;
  icon?: string | null;
  sort_order?: number | null;
};

export type CompanyRow = {
  id: string;
  owner_user_id: string;
  name?: string | null;
  logo_url?: string | null;
  description?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  website?: string | null;
  location?: string | null;
  founded_year?: number | null;
  operating_areas?: string[] | null;
  services?: string[] | null;
  fleet_types?: string[] | null;
  status: "draft" | "pending" | "active" | "approved" | "rejected";
  rejection_reason?: string | null;
};

export type CompanySettings = {
  interested_in_advertising?: boolean | null;
  interested_in_hiring_pilots?: boolean | null;
  interested_in_hiring_cabin_crew?: boolean | null;
  offers_crew_discounts?: boolean | null;
  join_founding_partners?: boolean | null;
  allow_crew_direct_messages?: boolean | null;
};

export type BusinessOnboardingData = {
  company: CompanyRow;
  companyTypes: CompanyType[];
  selectedCompanyTypeKeys: string[];
  settings: CompanySettings | null;
};

export type CompanyProfileInput = {
  companyName: string;
  location: string;
  email: string;
  phone?: string;
  website?: string;
  foundedYear?: string;
  description?: string;
  operatingAreas?: string[];
  servicesOffered?: string[];
  fleetTypes?: string[];
  logo?: string | null;
};

export type CommunityVisibilityInput = {
  advertising: boolean;
  hiringPilots: boolean;
  hiringCabinCrew: boolean;
  offerDiscounts: boolean;
  joinFounding: boolean;
  allowDMs: boolean;
};

export type ApiResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Could not find authenticated user.");
  return user.id;
}

function parseFoundedYear(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getCompanyProfileValidationError(profile: CompanyProfileInput) {
  if (!profile.companyName.trim()) return "Company name is required.";
  if (!profile.logo) return "Company logo is required.";
  if (!profile.location.trim()) return "Location is required.";
  if (!profile.email.trim()) return "Company email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return "Please enter a valid company email.";
  if (profile.phone && !/^\+?\d+$/.test(profile.phone)) return "Phone number can only include digits and one leading +.";
  if (profile.description && profile.description.length > 500) return "Company description must be 500 characters or less.";
  return null;
}

async function findEditableCompany(userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(`Error checking existing company: ${error.message}`);
  return data && data.length > 0 ? (data[0] as CompanyRow) : null;
}

export async function fetchCompanyTypes(): Promise<ApiResult<CompanyType[]>> {
  try {
    const { data: rawCompanyTypes, error: typesError } = await supabase
      .from("company_types")
      .select("*");

    if (typesError) throw new Error(typesError.message);

    let companyTypes: CompanyType[] = [];

    if (!rawCompanyTypes || rawCompanyTypes.length === 0) {
      // Fallback if the database table was emptied or RLS blocks it
      companyTypes = [
        { id: "00000000-0000-0000-0000-000000000001", key: "airline_operator", label: "Airline / Operator" },
        { id: "00000000-0000-0000-0000-000000000002", key: "charter_company", label: "Charter Company" },
        { id: "00000000-0000-0000-0000-000000000003", key: "flight_school", label: "Flight School" },
        { id: "00000000-0000-0000-0000-000000000004", key: "fbo", label: "FBO" },
        { id: "00000000-0000-0000-0000-000000000005", key: "mro_maintenance", label: "MRO / Maintenance" },
        { id: "00000000-0000-0000-0000-000000000006", key: "ground_handling", label: "Ground Handling" },
        { id: "00000000-0000-0000-0000-000000000007", key: "aviation_recruitment", label: "Aviation Recruitment" },
        { id: "00000000-0000-0000-0000-000000000009", key: "training_center", label: "Training Center" },
        { id: "00000000-0000-0000-0000-000000000010", key: "aviation_technology", label: "Aviation Technology" },
        { id: "00000000-0000-0000-0000-000000000011", key: "airport_services", label: "Airport Services" },
        { id: "00000000-0000-0000-0000-000000000012", key: "aircraft_management", label: "Aircraft Management" },
        { id: "00000000-0000-0000-0000-000000000013", key: "aircraft_sales_brokerage", label: "Aircraft Sales / Brokerage" },
        { id: "00000000-0000-0000-0000-000000000014", key: "aviation_retail", label: "Aviation Retail" },
        { id: "00000000-0000-0000-0000-000000000008", key: "other", label: "Other" }
      ];
    } else {
      // Safely map the raw types to our expected CompanyType interface
      // handling potential schema renames like label -> name
      companyTypes = rawCompanyTypes.map((t: any) => ({
        id: t.id,
        key: t.key || t.name, // fallback
        label: t.label || t.name || t.key, // fallback if label is removed
        icon: t.icon || null,
        sort_order: t.sort_order || 0,
      })).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return { success: true, data: companyTypes };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not load company types." };
  }
}

export async function ensureBusinessDraft(): Promise<ApiResult<CompanyRow>> {
  try {
    const userId = await getCurrentUserId();
    const existingCompany = await findEditableCompany(userId);

    if (existingCompany) {
      // Update auth metadata
      await supabase.auth.updateUser({ data: { accountType: "business" } });
      // Update users table because Syed's trigger defaults to flight_crew
      await supabase.from("users").update({ accountType: "business" }).eq("id", userId);
      return { success: true, data: existingCompany };
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({ 
        owner_user_id: userId, 
        status: "draft", 
        name: "", 
        location: "", 
        contact_email: "",
        description: "",
        phone: "",
        website: "",
        operating_areas: [],
        services: [],
        fleet_types: []
      })
      .select("*");

    if (error) throw new Error(error.message);
    const company = data && data.length > 0 ? (data[0] as CompanyRow) : null;
    if (!company) throw new Error("Could not create company record.");

    // Update auth metadata
    const { error: userError } = await supabase.auth.updateUser({ data: { accountType: "business" } });
    if (userError) throw new Error(userError.message);

    // Update users table because Syed's trigger defaults to flight_crew
    await supabase.from("users").update({ accountType: "business" }).eq("id", userId);

    return { success: true, data: company };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not create company draft." };
  }
}

export async function fetchBusinessOnboarding(): Promise<ApiResult<BusinessOnboardingData>> {
  try {
    const companyResponse = await ensureBusinessDraft();
    if (!companyResponse.success) return companyResponse;

    const company = companyResponse.data as any;
    const [typesResponse, [{ data: selections }, { data: settingsData, error: settingsError }]] =
      await Promise.all([
        fetchCompanyTypes(),
        Promise.all([
          supabase
            .from("company_type_selections")
            .select("company_type_id")
            .eq("company_id", company.id),
          supabase
            .from("company_settings")
            .select("*")
            .eq("company_id", company.id)
            .limit(1),
        ])
      ]);

    if (!typesResponse.success) throw new Error(typesResponse.error);
    if (settingsError) throw new Error(settingsError.message);

    const settings = settingsData && settingsData.length > 0 ? (settingsData[0] as CompanySettings) : null;
    const mappedCompanyTypes = typesResponse.data;
    const selectedIds = new Set((selections ?? []).map((selection) => selection.company_type_id));

    let selectedCompanyTypeKeys = mappedCompanyTypes
      .filter((companyType) => selectedIds.has(companyType.id))
      .map((companyType) => companyType.key);

    // Check company.services if DB company_type_selections is empty
    if (selectedCompanyTypeKeys.length === 0 && Array.isArray(company.services) && company.services.length > 0) {
      selectedCompanyTypeKeys = mappedCompanyTypes
        .filter((ct) => company.services.includes(ct.label) || company.services.includes(ct.key))
        .map((ct) => ct.key);
    }

    // Fallback: Check localStorage strictly for this specific company.id
    if (typeof window !== 'undefined' && company.id) {
      try {
        const savedKeys = localStorage.getItem("company_type_keys_" + company.id);
        if (savedKeys) {
          const parsed = JSON.parse(savedKeys) as string[];
          if (Array.isArray(parsed) && parsed.length > selectedCompanyTypeKeys.length) {
            selectedCompanyTypeKeys = parsed;
          }
        }
      } catch (e) {}
    }

    return {
      success: true,
      data: {
        company,
        companyTypes: mappedCompanyTypes,
        selectedCompanyTypeKeys,
        settings: settings ?? null,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not load business onboarding." };
  }
}

const DEFAULT_COMPANY_TYPES_MAP = [
  { key: "airline_operator", label: "Airline / Operator" },
  { key: "charter_company", label: "Charter Company" },
  { key: "flight_school", label: "Flight School" },
  { key: "fbo", label: "FBO" },
  { key: "mro_maintenance", label: "MRO / Maintenance" },
  { key: "ground_handling", label: "Ground Handling" },
  { key: "aviation_recruitment", label: "Aviation Recruitment" },
  { key: "training_center", label: "Training Center" },
  { key: "aviation_technology", label: "Aviation Technology" },
  { key: "airport_services", label: "Airport Services" },
  { key: "aircraft_management", label: "Aircraft Management" },
  { key: "aircraft_sales_brokerage", label: "Aircraft Sales / Brokerage" },
  { key: "aviation_retail", label: "Aviation Retail" },
  { key: "other", label: "Other" }
];

export async function saveCompanyTypeSelections(companyTypeKeys: string[]): Promise<ApiResult<CompanyRow>> {
  try {
    const companyResponse = await ensureBusinessDraft();
    if (!companyResponse.success) return companyResponse;

    const company = companyResponse.data;

    // Map keys to human-readable labels
    const selectedLabels = companyTypeKeys.map(key => {
      const match = DEFAULT_COMPANY_TYPES_MAP.find(d => d.key === key);
      return match ? match.label : key;
    });

    // Save company type labels into companies.services so active company owners can update types without RLS errors on company_type_selections
    const { error: updateServicesErr } = await supabase
      .from("companies")
      .update({ services: selectedLabels })
      .eq("id", company.id);

    if (updateServicesErr) {
      console.warn("Could not update companies.services:", updateServicesErr.message);
    }

    // Best-effort save to company_type_selections in Supabase database (works for draft/pending companies)
    try {
      const { data: dbTypes, error: fetchErr } = await supabase.from("company_types").select("*");
      if (fetchErr) console.warn("Could not fetch company_types:", fetchErr.message);

      if (dbTypes && dbTypes.length > 0) {
        const companyTypesByKey = new Map<string, string>();
        
        dbTypes.forEach((t: any) => {
          if (!t.id) return;
          if (t.key) companyTypesByKey.set(t.key, t.id);
          if (t.label) companyTypesByKey.set(t.label, t.id);
          if (t.name) companyTypesByKey.set(t.name, t.id);
          
          const normKey = (t.key || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
          if (normKey) companyTypesByKey.set(normKey, t.id);

          const normLabel = (t.label || t.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
          if (normLabel) companyTypesByKey.set(normLabel, t.id);
        });

        const selectedTypeIds = Array.from(new Set(
          companyTypeKeys
            .map((key) => {
              const defaultMatch = DEFAULT_COMPANY_TYPES_MAP.find(d => d.key === key);
              return (
                companyTypesByKey.get(key) ||
                (defaultMatch ? companyTypesByKey.get(defaultMatch.label) : null) ||
                (defaultMatch ? companyTypesByKey.get(defaultMatch.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")) : null) ||
                companyTypesByKey.get(key.toLowerCase().replace(/[^a-z0-9]+/g, "_"))
              );
            })
            .filter(Boolean) as string[]
        ));

        if (selectedTypeIds.length > 0) {
          const { error: delError } = await supabase
            .from("company_type_selections")
            .delete()
            .eq("company_id", company.id);

          if (delError) console.warn("Error deleting old company_type_selections:", delError.message);

          const { error: insError } = await supabase
            .from("company_type_selections")
            .insert(selectedTypeIds.map((id) => ({ company_id: company.id, company_type_id: id })));

          if (insError) {
            console.warn("Notice inserting company_type_selections (RLS restricted for active companies):", insError.message);
          }
        }
      }
    } catch (e) {
      console.warn("Exception saving company_type_selections:", e);
    }

    // Persist selected keys and labels strictly for this company.id
    if (typeof window !== 'undefined' && company.id) {
      try {
        localStorage.setItem("company_type_keys_" + company.id, JSON.stringify(companyTypeKeys));
        localStorage.setItem("company_types_" + company.id, JSON.stringify(selectedLabels));
      } catch (e) {}
    }

    return { success: true, data: company };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not save company types." };
  }
}


export async function saveCompanyProfile(profile: CompanyProfileInput): Promise<ApiResult<CompanyRow>> {
  try {
    const validationError = getCompanyProfileValidationError(profile);
    if (validationError) throw new Error(validationError);

    const companyResponse = await ensureBusinessDraft();
    if (!companyResponse.success) return companyResponse;

    const company = companyResponse.data;
    const { data: updatedData, error } = await supabase
      .from("companies")
      .update({
        name: profile.companyName.trim(),
        slug: profile.companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: normalizeOptionalText(profile.description),
        contact_email: profile.email.trim(),
        phone: normalizeOptionalText(profile.phone),
        website: normalizeOptionalText(profile.website),
        location: profile.location.trim(),
        founded_year: parseFoundedYear(profile.foundedYear),
        operating_areas: profile.operatingAreas ?? [],
        services: profile.servicesOffered ?? [],
        fleet_types: profile.fleetTypes ?? [],
        logo_url: profile.logo,
      })
      .eq("id", company.id)
      .select("*");

    if (error) throw new Error(error.message);
    const data = updatedData && updatedData.length > 0 ? (updatedData[0] as CompanyRow) : company;
    
    // Sync logo_url into users.profileImage so Mobile App displays company logos on posts
    if (profile.logo && company.owner_user_id) {
      await supabase
        .from("users")
        .update({ profileImage: profile.logo })
        .eq("id", company.owner_user_id);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not save company profile." };
  }
}

export async function saveCompanySettings(visibility: CommunityVisibilityInput): Promise<ApiResult<CompanyRow>> {
  try {
    const companyResponse = await ensureBusinessDraft();
    if (!companyResponse.success) return companyResponse;

    const company = companyResponse.data;
    const { data: existingSettingsData, error: fetchError } = await supabase
      .from("company_settings")
      .select("company_id")
      .eq("company_id", company.id)
      .limit(1);

    if (fetchError) throw new Error(fetchError.message);
    const existingSettings = existingSettingsData && existingSettingsData.length > 0 ? existingSettingsData[0] : null;

    const payload = {
      company_id: company.id,
      interested_in_advertising: visibility.advertising,
      interested_in_hiring_pilots: visibility.hiringPilots,
      interested_in_hiring_cabin_crew: visibility.hiringCabinCrew,
      offers_crew_discounts: visibility.offerDiscounts,
      join_founding_partners: visibility.joinFounding,
      allow_crew_direct_messages: visibility.allowDMs,
    };

    let error;
    if (existingSettings) {
      const { error: updateError } = await supabase
        .from("company_settings")
        .update(payload)
        .eq("company_id", company.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("company_settings")
        .insert(payload);
      error = insertError;
    }

    if (error) throw new Error(error.message);
    return { success: true, data: company };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not save company settings." };
  }
}

export async function submitBusinessOnboarding(
  onboardingData?: BusinessOnboardingData,
): Promise<ApiResult<CompanyRow>> {
  try {
    const userId = await getCurrentUserId();
    const onboardingResponse = onboardingData
      ? ({ success: true, data: onboardingData } as const)
      : await fetchBusinessOnboarding();

    if (!onboardingResponse.success) return onboardingResponse;

    const { company, selectedCompanyTypeKeys } = onboardingResponse.data;
    const validationError = getCompanyProfileValidationError({
      companyName: company.name ?? "",
      location: company.location ?? "",
      email: company.contact_email ?? "",
      phone: company.phone ?? undefined,
      website: company.website ?? undefined,
      foundedYear: company.founded_year ? String(company.founded_year) : undefined,
      description: company.description ?? undefined,
      operatingAreas: company.operating_areas ?? [],
      servicesOffered: company.services ?? [],
      fleetTypes: company.fleet_types ?? [],
      logo: company.logo_url ?? null,
    });

    if (validationError) throw new Error(validationError);
    if (selectedCompanyTypeKeys.length === 0) throw new Error("Select at least one company type.");

    const nextStatus = (company.status === "active" || company.status === "approved") ? company.status : "pending";

    const { data: updatedData, error } = await supabase
      .from("companies")
      .update({
        status: nextStatus,
      })
      .eq("id", company.id)
      .select("*");

    if (error) throw new Error(error.message);
    const data = updatedData && updatedData.length > 0 ? (updatedData[0] as CompanyRow) : company;

    const { error: userError } = await supabase.auth.updateUser({ data: { accountType: "business", onboarded: true } });
    if (userError) throw new Error(userError.message);

    await supabase.from("users").update({ 
      accountType: "business",
      onboarded: 1
    }).eq("id", userId);

    if (company.logo_url) {
      if (typeof window !== "undefined") {
        localStorage.setItem("userProfilePhoto", company.logo_url);
      }
      await supabase
        .from("profiles")
        .update({ avatar_url: company.logo_url })
        .eq("id", userId);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not submit company profile." };
  }
}
