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
  status: "draft" | "pending" | "active" | "rejected";
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
    .in("status", ["draft", "pending", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CompanyRow>();

  if (error) throw new Error(`Error checking existing company: ${error.message}`);
  return data;
}

export async function fetchCompanyTypes(): Promise<ApiResult<CompanyType[]>> {
  try {
    const { data, error } = await supabase
      .from("company_types")
      .select("id, key, label, icon, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: data ?? [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not load company types." };
  }
}

export async function ensureBusinessDraft(): Promise<ApiResult<CompanyRow>> {
  try {
    const userId = await getCurrentUserId();
    const existingCompany = await findEditableCompany(userId);

    if (existingCompany) {
      await supabase.from("users").update({ accountType: "business" }).eq("id", userId);
      return { success: true, data: existingCompany };
    }

    const { data: company, error } = await supabase
      .from("companies")
      .insert({ owner_user_id: userId, status: "draft", name: "" })
      .select("*")
      .single<CompanyRow>();

    if (error) throw new Error(error.message);

    const { error: memberError } = await supabase
      .from("company_members")
      .upsert(
        {
          company_id: company.id,
          user_id: userId,
          role: "owner",
        },
        { onConflict: "company_id,user_id" },
      );

    if (memberError) throw new Error(memberError.message);

    const { error: userError } = await supabase
      .from("users")
      .update({ accountType: "business" })
      .eq("id", userId);

    if (userError) throw new Error(userError.message);

    return { success: true, data: company };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not create company draft." };
  }
}

export async function fetchBusinessOnboarding(): Promise<ApiResult<BusinessOnboardingData>> {
  try {
    const companyResponse = await ensureBusinessDraft();
    if (!companyResponse.success) return companyResponse;

    const company = companyResponse.data;
    const [{ data: companyTypes, error: companyTypesError }, { data: selections, error: selectionsError }, { data: settings, error: settingsError }] =
      await Promise.all([
        supabase
          .from("company_types")
          .select("id, key, label, icon, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("label", { ascending: true }),
        supabase
          .from("company_type_selections")
          .select("company_type_id")
          .eq("company_id", company.id),
        supabase
          .from("company_settings")
          .select("*")
          .eq("company_id", company.id)
          .maybeSingle<CompanySettings>(),
      ]);

    if (companyTypesError) throw new Error(companyTypesError.message);
    if (selectionsError) throw new Error(selectionsError.message);
    if (settingsError) throw new Error(settingsError.message);

    const selectedIds = new Set((selections ?? []).map((selection) => selection.company_type_id));
    const selectedCompanyTypeKeys = (companyTypes ?? [])
      .filter((companyType) => selectedIds.has(companyType.id))
      .map((companyType) => companyType.key);

    return {
      success: true,
      data: {
        company,
        companyTypes: companyTypes ?? [],
        selectedCompanyTypeKeys,
        settings: settings ?? null,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not load business onboarding." };
  }
}

export async function saveCompanyTypeSelections(companyTypeKeys: string[]): Promise<ApiResult<CompanyRow>> {
  try {
    const companyResponse = await ensureBusinessDraft();
    if (!companyResponse.success) return companyResponse;

    const company = companyResponse.data;
    const typesResponse = await fetchCompanyTypes();
    if (!typesResponse.success) return typesResponse;

    const companyTypesByKey = new Map(typesResponse.data.map((companyType) => [companyType.key, companyType]));
    const selectedTypeIds = companyTypeKeys.map((key) => companyTypesByKey.get(key)?.id).filter(Boolean) as string[];

    if (selectedTypeIds.length !== companyTypeKeys.length) {
      throw new Error("Some selected company types are no longer available.");
    }

    const { error: deleteError } = await supabase
      .from("company_type_selections")
      .delete()
      .eq("company_id", company.id);

    if (deleteError) throw new Error(deleteError.message);

    if (selectedTypeIds.length > 0) {
      const { error: insertError } = await supabase
        .from("company_type_selections")
        .insert(selectedTypeIds.map((companyTypeId) => ({ company_id: company.id, company_type_id: companyTypeId })));

      if (insertError) throw new Error(insertError.message);
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
    const { data, error } = await supabase
      .from("companies")
      .update({
        name: profile.companyName.trim(),
        logo_url: profile.logo,
        description: normalizeOptionalText(profile.description),
        contact_email: profile.email.trim(),
        phone: normalizeOptionalText(profile.phone),
        website: normalizeOptionalText(profile.website),
        location: profile.location.trim(),
        founded_year: parseFoundedYear(profile.foundedYear),
        operating_areas: profile.operatingAreas ?? [],
        services: profile.servicesOffered ?? [],
        fleet_types: profile.fleetTypes ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id)
      .select("*")
      .single<CompanyRow>();

    if (error) throw new Error(error.message);
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
    const { error } = await supabase
      .from("company_settings")
      .upsert(
        {
          company_id: company.id,
          interested_in_advertising: visibility.advertising,
          interested_in_hiring_pilots: visibility.hiringPilots,
          interested_in_hiring_cabin_crew: visibility.hiringCabinCrew,
          offers_crew_discounts: visibility.offerDiscounts,
          join_founding_partners: visibility.joinFounding,
          allow_crew_direct_messages: visibility.allowDMs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      );

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

    const { data, error } = await supabase
      .from("companies")
      .update({
        status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id)
      .select("*")
      .single<CompanyRow>();

    if (error) throw new Error(error.message);

    const { error: userError } = await supabase
      .from("users")
      .update({ accountType: "business", onboarded: 1 })
      .eq("id", userId);

    if (userError) throw new Error(userError.message);

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not submit company profile." };
  }
}
