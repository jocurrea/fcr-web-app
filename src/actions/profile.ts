"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasInvalidCharacters } from "@/lib/validation/input-restrictions";
import { hasScriptInjection, TEXT_LIMITS, sanitizeAndClampText } from "@/lib/validation/text-limits";
import { validateContactInfo } from "@/lib/validation/contact-rules";
import { validateExperienceDates } from "@/lib/validation/date-rules";

const MAX_SUMMARY_LENGTH = TEXT_LIMITS.SUMMARY;

/**
 * Server Action to revalidate Next.js server cache for layouts,
 * navbar, and profile pages upon successful profile mutations.
 */
export async function revalidateProfileLayout() {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/home");
    return { success: true };
  } catch (err: any) {
    console.error("[revalidateProfileLayout] Error:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Server Action to validate and persist the Aviation Professional Summary ("About Me").
 * Enforces strict backend validation:
 * - Field is required (non-empty)
 * - Maximum character length: 1000 chars (rejects anything exceeding limit)
 * - XSS script injection blocking
 */
export async function saveProfessionalSummaryAction(summary: string) {
  try {
    // 1. Backend validation: Required field check
    if (typeof summary !== "string" || summary.trim().length === 0) {
      return {
        success: false,
        error: "About Me is a required field.",
      };
    }

    const trimmed = summary.trim();

    // 2. Backend validation: Script injection check
    if (hasScriptInjection(trimmed)) {
      return {
        success: false,
        error: "Security alert: Potentially malicious script injection detected in summary.",
      };
    }

    // 3. Backend validation: Character limit check
    if (trimmed.length > MAX_SUMMARY_LENGTH) {
      return {
        success: false,
        error: `Summary text exceeds the maximum allowed limit of ${MAX_SUMMARY_LENGTH} characters. Received ${trimmed.length} characters.`,
      };
    }

    // 4. Backend validation: Emoji & special character restrictions
    if (hasInvalidCharacters(trimmed)) {
      return {
        success: false,
        error: "Only letters, numbers, spaces, and standard punctuation are allowed. Emojis and special characters are not permitted.",
      };
    }

    // 3. User authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to update profile summary.",
      };
    }

    // 4. Update resumes table for user
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const updatedPersonal = {
      ...(resumeData.personal || {}),
      aboutMe: trimmed,
      description: trimmed,
      category: "aviation_professional",
      role: "aviation_professional",
    };

    const { error: upsertErr } = await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          summary: trimmed,
          personal: updatedPersonal,
        },
      },
      { onConflict: "userId" }
    );

    if (upsertErr) {
      console.error("[saveProfessionalSummaryAction] Supabase error:", upsertErr);
      return { success: false, error: upsertErr.message };
    }

    // Migration 066: Also sync to flight_crew_profiles."resumeSummary" if profile exists
    try {
      await supabase
        .from("flight_crew_profiles")
        .update({ resumeSummary: trimmed })
        .eq("userId", user.id);
    } catch (fcErr) {
      console.warn("[saveProfessionalSummaryAction] flight_crew_profiles notice:", fcErr);
    }

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (err: any) {
    console.error("[saveProfessionalSummaryAction] Unexpected exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving summary.",
    };
  }
}

/**
 * Server Action to validate and persist Personal Description (Bio).
 * Migration 066:
 * - Read and update Personal Description through public.user_profiles.bio
 * - Sync to users.bio for legacy compatibility
 * - Does NOT overwrite flight_crew_profiles."resumeSummary" or resumes.data.summary
 */
export async function savePersonalDescriptionAction(description: string) {
  try {
    if (typeof description !== "string") {
      return { success: false, error: "Invalid description format." };
    }
    const trimmed = description.trim();
    if (hasScriptInjection(trimmed)) {
      return { success: false, error: "Security alert: Potentially malicious script injection detected in description." };
    }
    if (trimmed.length > MAX_SUMMARY_LENGTH) {
      return { success: false, error: `Personal description exceeds maximum limit of ${MAX_SUMMARY_LENGTH} characters.` };
    }
    if (trimmed.length > 0 && hasInvalidCharacters(trimmed)) {
      return { success: false, error: "Only letters, numbers, spaces, and standard punctuation are allowed. Emojis and special characters are not permitted." };
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Authentication required to update personal description." };
    }

    // 1. Update public.user_profiles.bio (canonical)
    const { error: upErr } = await supabase
      .from("user_profiles")
      .update({ bio: trimmed || null })
      .eq("userId", user.id);

    if (upErr) {
      console.warn("[savePersonalDescriptionAction] user_profiles.bio update warning:", upErr);
    }

    // 2. Update public.users.bio (legacy compatibility)
    try {
      await supabase
        .from("users")
        .update({ bio: trimmed || null })
        .eq("id", user.id);
    } catch (usersErr) {
      console.warn("[savePersonalDescriptionAction] users.bio sync notice:", usersErr);
    }

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    return { success: true };
  } catch (err: any) {
    console.error("[savePersonalDescriptionAction] Error:", err);
    return { success: false, error: err?.message || "Failed to save personal description." };
  }
}

/**
 * Server Action to validate and persist Resume Summary.
 * Migration 066:
 * - Pilot/Crew: read/update Resume Summary through public.flight_crew_profiles."resumeSummary"
 * - Sync to resumes.data.summary for legacy compatibility
 * - Does NOT overwrite user_profiles.bio or users.bio
 */
export async function saveResumeSummaryAction(summary: string) {
  try {
    if (typeof summary !== "string" || summary.trim().length === 0) {
      return { success: false, error: "Resume Summary is required." };
    }
    const trimmed = summary.trim();
    if (hasScriptInjection(trimmed)) {
      return { success: false, error: "Security alert: Potentially malicious script injection detected in summary." };
    }
    if (trimmed.length > MAX_SUMMARY_LENGTH) {
      return { success: false, error: `Resume summary exceeds maximum limit of ${MAX_SUMMARY_LENGTH} characters.` };
    }
    if (hasInvalidCharacters(trimmed)) {
      return { success: false, error: "Only letters, numbers, spaces, and standard punctuation are allowed. Emojis and special characters are not permitted." };
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Authentication required to update resume summary." };
    }

    // 1. Update public.flight_crew_profiles."resumeSummary"
    try {
      await supabase
        .from("flight_crew_profiles")
        .update({ resumeSummary: trimmed })
        .eq("userId", user.id);
    } catch (fcErr) {
      console.warn("[saveResumeSummaryAction] flight_crew_profiles notice:", fcErr);
    }

    // 2. Update resumes.data.summary (legacy compatibility)
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          summary: trimmed,
        },
      },
      { onConflict: "userId" }
    );

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    return { success: true };
  } catch (err: any) {
    console.error("[saveResumeSummaryAction] Error:", err);
    return { success: false, error: err?.message || "Failed to save resume summary." };
  }
}


export interface SaveContactCredentialsInput {
  phone: string;
  email: string;
  licenses: string[];
}

/**
 * Server Action to validate and persist Aviation Professional Contact & Credentials.
 * Enforces strict backend validation:
 * - Phone and Email are mandatory
 * - Phone format validation (allowed characters, min 7 digits)
 * - Email format validation (standard valid email address)
 * - At least one free-text license/certification
 */
export async function saveContactCredentialsAction(input: SaveContactCredentialsInput) {
  try {
    const { phone, email, licenses } = input;

    // 1. Backend validation: Required fields (Scenario 1)
    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return { success: false, error: "Phone number is required." };
    }
    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return { success: false, error: "Contact email is required." };
    }

    // 2. Backend validation: Phone and Email formats (Scenario 3)
    const trimmedPhone = phone.trim();
    const phoneDigits = (trimmedPhone.match(/\d/g) || []).length;
    const phoneRegex = /^[+]?[\d\s().-]{7,25}$/;
    if (!phoneRegex.test(trimmedPhone) || phoneDigits < 7) {
      return { success: false, error: "Please enter a valid phone number (at least 7 digits)." };
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: "Please enter a valid email address format (e.g. name@domain.com)." };
    }

    // 3. Backend validation: Free-text licenses list (Scenario 2)
    const validLicenses = Array.isArray(licenses)
      ? licenses.map((l) => (typeof l === "string" ? l.trim() : "")).filter(Boolean)
      : [];

    if (validLicenses.length === 0) {
      return { success: false, error: "Please specify at least one license or certification." };
    }

    // Backend validation: Emoji and special character restriction
    for (const lic of validLicenses) {
      if (hasInvalidCharacters(lic)) {
        return {
          success: false,
          error: "Licenses/certifications can only contain alphanumeric characters, spaces, and standard punctuation (., -). Emojis and special characters are not allowed.",
        };
      }
    }

    // 4. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update contact credentials." };
    }

    // 5. Update user_profiles
    const userProfilePayload = {
      contactEmail: trimmedEmail,
      contactPhone: trimmedPhone,
      professionalCredentials: validLicenses,
    };

    const { data: updateData, error: upError } = await supabase
      .from("user_profiles")
      .update(userProfilePayload)
      .eq("user_id", user.id)
      .select();

    if (!upError && (!updateData || updateData.length === 0)) {
      await supabase
        .from("user_profiles")
        .insert({ user_id: user.id, ...userProfilePayload });
    }

    // 6. Update resumes
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const updatedPersonal = {
      ...(resumeData.personal || {}),
      email: trimmedEmail,
      phone: trimmedPhone,
      contactEmail: trimmedEmail,
      contactPhone: trimmedPhone,
      licenseCertification: validLicenses[0] || "",
      licenses: validLicenses,
      professionalCredentials: validLicenses,
      category: "aviation_professional",
      role: "aviation_professional",
    };

    const updatedLicenses = validLicenses.map((lic, idx) => ({
      id: `license-${idx + 1}`,
      name: lic,
      number: "N/A",
      country: "Global",
    }));

    await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          personal: updatedPersonal,
          licenses: updatedLicenses,
        },
      },
      { onConflict: "userId" }
    );

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (err: any) {
    console.error("[saveContactCredentialsAction] Unexpected exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving contact credentials.",
    };
  }
}

export interface WorkExperienceInput {
  id?: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
}

export interface SaveComplementaryInfoInput {
  city?: string;
  country?: string;
  languages?: string[];
  workExperiences?: WorkExperienceInput[];
}

/**
 * Server Action to validate and persist Aviation Professional Complementary Info (Step 5).
 * All fields are optional (Scenario 1 & 3).
 * Persists location to user_profiles and resumes.
 * Persists work experiences and languages to resumes.
 */
export async function saveComplementaryInfoAction(input: SaveComplementaryInfoInput) {
  try {
    const { city = "", country = "", languages = [], workExperiences = [] } = input;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update profile details." };
    }

    // Chronological date validation for any provided experiences
    for (const exp of workExperiences) {
      if (exp.startDate) {
        const dateRes = validateExperienceDates(exp.startDate, exp.endDate, false);
        if (!dateRes.isValid && dateRes.error) {
          return { success: false, error: dateRes.error };
        }
      }
    }

    const trimmedCity = typeof city === "string" ? city.trim().slice(0, TEXT_LIMITS.EXP_CITY) : "";
    if (trimmedCity) {
      if (hasScriptInjection(trimmedCity)) {
        return {
          success: false,
          error: "Security alert: Potentially malicious script injection detected in city.",
        };
      }
      if (hasInvalidCharacters(trimmedCity)) {
        return {
          success: false,
          error: "City can only contain alphanumeric characters, spaces, and standard punctuation (., -). Emojis and special characters are not allowed.",
        };
      }
    }
    const trimmedCountry = typeof country === "string" ? country.trim().slice(0, 100) : "";
    const combinedLocation = [trimmedCity, trimmedCountry].filter(Boolean).join(", ");

    // 1. Update user_profiles if location provided
    const userProfilePayload: Record<string, any> = {};
    if (trimmedCity) userProfilePayload.locationCity = trimmedCity;
    if (trimmedCountry) userProfilePayload.locationCountry = trimmedCountry;

    if (Object.keys(userProfilePayload).length > 0) {
      const { data: updateData, error: upError } = await supabase
        .from("user_profiles")
        .update(userProfilePayload)
        .eq("user_id", user.id)
        .select();

      if (!upError && (!updateData || updateData.length === 0)) {
        await supabase
          .from("user_profiles")
          .insert({ user_id: user.id, ...userProfilePayload });
      }
    }

    // 2. Update resumes table
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const validExperiences = Array.isArray(workExperiences)
      ? workExperiences
          .filter(exp => exp.companyName?.trim() || exp.roleTitle?.trim())
          .map(exp => ({
            ...exp,
            companyName: sanitizeAndClampText(exp.companyName, TEXT_LIMITS.EXP_COMPANY),
            roleTitle: sanitizeAndClampText(exp.roleTitle, TEXT_LIMITS.EXP_TITLE),
          }))
          .filter(exp => !hasScriptInjection(exp.companyName) && !hasScriptInjection(exp.roleTitle))
      : [];

    const updatedPersonal = {
      ...(resumeData.personal || {}),
      city: trimmedCity,
      country: trimmedCountry,
      locationCity: trimmedCity,
      locationCountry: trimmedCountry,
      location: combinedLocation,
      languages: Array.isArray(languages) ? languages : [],
      workExperiences: validExperiences,
      category: "aviation_professional",
      role: "aviation_professional",
    };

    const formattedWork = validExperiences.map((exp, idx) => ({
      id: exp.id || `work-${idx + 1}`,
      company: exp.companyName,
      role: exp.roleTitle,
      startDate: exp.startDate,
      endDate: exp.endDate,
    }));

    await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          personal: updatedPersonal,
          work: formattedWork,
          languages: Array.isArray(languages) ? languages : [],
        },
      },
      { onConflict: "userId" }
    );

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (err: any) {
    console.error("[saveComplementaryInfoAction] Unexpected exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving optional information.",
    };
  }
}

export interface SaveSkillsResponse {
  success: boolean;
  error?: string;
}

/**
 * [Web] E01-HU08: Skills & Expertise Selection and Management
 * Persists technical skills conforming to the Pilot/Crew skill matrix data architecture.
 * Updates resumes (data.skills, data.personal.skills, data.personal.structuredSkills)
 * and standardized skills RPC if present.
 */
export async function saveSkillsAction(
  skills: string[]
): Promise<SaveSkillsResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to update skills.",
      };
    }

    // FIX-08: Check for duplicates in submitted skills list
    const seenSkills = new Set<string>();
    for (const raw of skills || []) {
      if (typeof raw === "string" && raw.trim()) {
        const norm = raw.trim().toLowerCase();
        if (seenSkills.has(norm)) {
          return {
            success: false,
            error: "This item is already in your list",
          };
        }
        seenSkills.add(norm);
      }
    }

    const cleanedSkills = (Array.isArray(skills) ? skills : [])
      .map((s) => (typeof s === "string" ? sanitizeAndClampText(s, TEXT_LIMITS.SKILL_NAME) : ""))
      .filter((s) => Boolean(s) && !hasScriptInjection(s));

    // Limit to max 30 skills to prevent payload abuse
    const uniqueSkills = Array.from(new Set(cleanedSkills)).slice(0, 30);

    const structuredSkills = uniqueSkills.map((name, idx) => ({
      id: `skill-${idx + 1}`,
      name,
    }));

    // 1. Update resumes table matching Pilot/Crew architecture
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const updatedPersonal = {
      ...(resumeData.personal || {}),
      skills: uniqueSkills,
      structuredSkills: structuredSkills,
      category: "aviation_professional",
      role: "aviation_professional",
    };

    const { error: upsertErr } = await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          personal: updatedPersonal,
          skills: uniqueSkills,
        },
      },
      { onConflict: "userId" }
    );

    if (upsertErr) {
      console.error("[saveSkillsAction] Error updating resumes table:", upsertErr);
      return { success: false, error: upsertErr.message };
    }

    // 2. Call standardized user skills RPC (Pilot/Crew matrix compatibility)
    try {
      await supabase.rpc("replace_standardized_user_skills", {
        p_skills: uniqueSkills,
      });
    } catch {
      try {
        await supabase.rpc("replace_standardized_user_skills", {
          skills: uniqueSkills,
        });
      } catch {
        // RPC might not exist in all environments, safe to ignore
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (err: any) {
    console.error("[saveSkillsAction] Unexpected exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving skills.",
    };
  }
}

export interface LanguageItemInput {
  name: string;
  proficiency?: string;
}

export interface SaveLanguagesResponse {
  success: boolean;
  error?: string;
}

/**
 * [Web] FIX-08: Save Languages Action with Uniqueness Validation & State Sync
 * Enforces server-side uniqueness check without silent unification loss.
 */
export async function saveLanguagesAction(
  languages: Array<LanguageItemInput | string>
): Promise<SaveLanguagesResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to update languages.",
      };
    }

    // FIX-08: Backend Uniqueness Validation
    const seenLangs = new Set<string>();
    const normalizedLanguages: Array<{ name: string; proficiency: string }> = [];

    for (const item of languages || []) {
      const rawName = typeof item === "string" ? item : item?.name;
      const proficiency = typeof item === "string" ? "Conversational" : item?.proficiency || "Conversational";
      if (!rawName || typeof rawName !== "string" || !rawName.trim()) continue;

      const trimmedName = rawName.trim();
      const norm = trimmedName.toLowerCase();
      if (seenLangs.has(norm)) {
        return {
          success: false,
          error: "This item is already in your list",
        };
      }
      seenLangs.add(norm);
      normalizedLanguages.push({
        name: sanitizeAndClampText(trimmedName, 60),
        proficiency: sanitizeAndClampText(proficiency, 40),
      });
    }

    // 1. Update resumes table
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const updatedPersonal = {
      ...(resumeData.personal || {}),
      languages: normalizedLanguages.map((l) => l.name),
      structuredLanguages: normalizedLanguages,
    };

    const { error: upsertErr } = await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          personal: updatedPersonal,
          languages: normalizedLanguages,
        },
      },
      { onConflict: "userId" }
    );

    if (upsertErr) {
      console.error("[saveLanguagesAction] Error updating resumes table:", upsertErr);
      return { success: false, error: upsertErr.message };
    }

    // 2. Update user_profiles table if spokenLanguages or languages exists
    try {
      await supabase
        .from("user_profiles")
        .update({
          spokenLanguages: normalizedLanguages.map((l) => l.name),
        })
        .eq("user_id", user.id);
    } catch (e) {
      console.warn("[saveLanguagesAction] user_profiles update notice:", e);
    }

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (err: any) {
    console.error("[saveLanguagesAction] Unexpected exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving languages.",
    };
  }
}

export interface SaveAvailabilityResponse {
  success: boolean;
  status?: "active" | "available_for_work";
  error?: string;
}

/**
 * [Web] E01-HU09: Work Availability Status
 * Toggles and updates availability status across user_profiles, aviation_professional_profiles,
 * users, and resumes tables.
 */
export async function saveAvailabilityStatusAction(
  rawStatus: "active" | "available_for_work" | "available" | string
): Promise<SaveAvailabilityResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to update availability status.",
      };
    }

    // DB check constraint on user_profiles.workAvailabilityStatus strictly accepts 'active' | 'available_for_work'
    const canonicalStatus: "active" | "available_for_work" =
      rawStatus === "available" ||
      rawStatus === "available_for_work" ||
      rawStatus === "#OpenToWork" ||
      rawStatus === "open_to_work"
        ? "available_for_work"
        : "active";

    // 1. Update user_profiles
    try {
      const { data: upData, error: upError } = await supabase
        .from("user_profiles")
        .update({ workAvailabilityStatus: canonicalStatus })
        .eq("user_id", user.id)
        .select();

      if (!upError && (!upData || upData.length === 0)) {
        const { data: upData2, error: upError2 } = await supabase
          .from("user_profiles")
          .update({ workAvailabilityStatus: canonicalStatus })
          .eq("userId", user.id)
          .select();

        if (!upError2 && (!upData2 || upData2.length === 0)) {
          await supabase
            .from("user_profiles")
            .insert({ user_id: user.id, workAvailabilityStatus: canonicalStatus });
        }
      }
    } catch (e) {
      console.warn("[saveAvailabilityStatusAction] user_profiles notice:", e);
    }

    // 2. Update aviation_professional_profiles
    try {
      await supabase
        .from("aviation_professional_profiles")
        .update({ workAvailabilityStatus: canonicalStatus })
        .eq("userId", user.id);
    } catch (e) {
      console.warn("[saveAvailabilityStatusAction] aviation_professional_profiles notice:", e);
    }

    // 3. Update users table
    try {
      await supabase
        .from("users")
        .update({
          availability_status: canonicalStatus,
          work_availability: canonicalStatus === "available_for_work" ? "available" : "active",
        })
        .eq("id", user.id);
    } catch (e) {
      console.warn("[saveAvailabilityStatusAction] users notice:", e);
    }

    // 4. Update resumes table
    try {
      const { data: currentResume } = await supabase
        .from("resumes")
        .select("data")
        .eq("userId", user.id)
        .maybeSingle();

      const resumeData = (currentResume?.data as any) || {};
      const updatedPersonal = {
        ...(resumeData.personal || {}),
        availabilityStatus: canonicalStatus,
        workAvailability: canonicalStatus === "available_for_work" ? "available" : "active",
      };

      await supabase.from("resumes").upsert(
        {
          userId: user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal,
          },
        },
        { onConflict: "userId" }
      );
    } catch (e) {
      console.warn("[saveAvailabilityStatusAction] resumes notice:", e);
    }

    // 5. Try calling get_my_profile RPC
    try {
      await supabase.rpc("get_my_profile");
    } catch {}

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/search");

    return { success: true, status: canonicalStatus };
  } catch (err: any) {
    console.error("[saveAvailabilityStatusAction] Unexpected error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving availability status.",
    };
  }
}

export interface SaveContactInfoInput {
  phone: string;
  email: string;
  workCountry?: string;
}

/**
 * Server Action to validate and persist Pilot/Crew contact info (Phone & Email).
 * FIX-05: Prevents silent failure by actively validating format on backend.
 */
export async function saveContactInfoAction(input: SaveContactInfoInput) {
  try {
    const { phone, email, workCountry } = input;

    // Backend validation using contact rules
    const { isValid, phoneError, emailError } = validateContactInfo(phone, email, true);
    if (!isValid) {
      return {
        success: false,
        error: phoneError || emailError || "Invalid contact details.",
      };
    }

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update contact information." };
    }

    // 1. Update user_profiles
    const userProfilePayload: Record<string, any> = {
      contactEmail: trimmedEmail,
      contactPhone: trimmedPhone,
    };
    if (workCountry) {
      userProfilePayload.workCountry = workCountry;
    }

    try {
      const { data: upData, error: upError } = await supabase
        .from("user_profiles")
        .update(userProfilePayload)
        .eq("user_id", user.id)
        .select();

      if (!upError && (!upData || upData.length === 0)) {
        await supabase
          .from("user_profiles")
          .update(userProfilePayload)
          .eq("userId", user.id);
      }
    } catch (e) {
      console.warn("[saveContactInfoAction] user_profiles update notice:", e);
    }

    // 2. Update resumes table
    try {
      const { data: currentResume } = await supabase
        .from("resumes")
        .select("data")
        .eq("userId", user.id)
        .maybeSingle();

      const resumeData = (currentResume?.data as any) || {};
      const updatedPersonal = {
        ...(resumeData.personal || {}),
        email: trimmedEmail,
        phone: trimmedPhone,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        ...(workCountry ? { workCountry } : {}),
      };

      await supabase.from("resumes").upsert(
        {
          userId: user.id,
          data: {
            ...resumeData,
            personal: updatedPersonal,
          },
        },
        { onConflict: "userId" }
      );
    } catch (e) {
      console.warn("[saveContactInfoAction] resumes update notice:", e);
    }

    revalidatePath("/", "layout");
    revalidatePath("/profile");

    return { success: true };
  } catch (err: any) {
    console.error("[saveContactInfoAction] Unexpected error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving contact information.",
    };
  }
}

export interface SaveCareerExperienceInput {
  company: string;
  role: string;
  startDate: string;
  endDate?: string | null;
  planes?: string[];
  description?: string;
}

/**
 * Server Action to validate and persist Pilot/Crew career experiences.
 * FIX-06: Enforces chronological alignment (Start_Date <= Today, End_Date >= Start_Date).
 * Handles nullable End_Date for current employment without breaking chronology.
 */
export async function saveCareerExperienceAction(input: SaveCareerExperienceInput) {
  try {
    const { company, role, startDate, endDate, planes = [], description = "" } = input;
    if (!company.trim() || !role.trim()) {
      return { success: false, error: "Company name and role title are required." };
    }

    const dateRes = validateExperienceDates(startDate, endDate, true);
    if (!dateRes.isValid) {
      return { success: false, error: dateRes.error || "Invalid experience dates." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update career experience." };
    }

    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const existingWork = Array.isArray(resumeData.work) ? resumeData.work : [];

    const isCurrent = !endDate || String(endDate).trim().toLowerCase() === "present";
    const newExperience = {
      id: `work-${Date.now()}`,
      company: sanitizeAndClampText(company, TEXT_LIMITS.EXP_COMPANY),
      role: sanitizeAndClampText(role, TEXT_LIMITS.EXP_TITLE),
      startDate,
      endDate: isCurrent ? null : (endDate || null),
      isCurrent,
      planes: Array.isArray(planes)
        ? planes.map((p) => sanitizeAndClampText(p, TEXT_LIMITS.EXP_PLANE)).filter(Boolean)
        : [],
      description: description ? sanitizeAndClampText(description, 1000) : null,
    };

    const updatedWork = [...existingWork, newExperience];

    await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: {
          ...resumeData,
          work: updatedWork,
        },
      },
      { onConflict: "userId" }
    );

    revalidatePath("/", "layout");
    revalidatePath("/profile");

    return { success: true };
  } catch (err: any) {
    console.error("[saveCareerExperienceAction] Error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving career experience.",
    };
  }
}

export interface SavePersonalInfoInput {
  role?: "pilot" | "crew";
  employmentStatus?: string;
  civilStatus?: string;
  dateOfBirth?: string;
  children?: string;
  purgeIncompatibleData?: boolean;
}

/**
 * [Web] FIX-07: Role Change Dependency Safeguards & Personal Information Action
 * Enforces safeguards when switching from Pilot to Crew:
 * Purges incompatible licenses and flight hour metrics to prevent DB inconsistencies
 * and ensure pilot licenses never appear on cabin crew profiles.
 * Migration 064: Completed Pilot/Crew accounts have locked roles.
 */
export async function savePersonalInfoAction(input: SavePersonalInfoInput) {
  try {
    const {
      role,
      employmentStatus,
      civilStatus,
      dateOfBirth,
      children,
      purgeIncompatibleData = true,
    } = input;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update personal information." };
    }

    const isCrew = role === "crew";

    // Migration 064 check: Pilot/Crew roles lock after onboarding
    if (role) {
      const { data: userRecord } = await supabase
        .from("users")
        .select("onboarded, role, accountType")
        .eq("id", user.id)
        .maybeSingle();

      const isOnboarded =
        userRecord?.onboarded === 1 ||
        userRecord?.onboarded === true ||
        String(userRecord?.onboarded) === "1" ||
        String(userRecord?.onboarded).toLowerCase() === "true";

      const currentRole = userRecord?.role || userRecord?.accountType;
      const isPilotOrCrew = currentRole === "pilot" || currentRole === "crew" || currentRole === "flight_crew";

      if (isOnboarded && isPilotOrCrew && currentRole !== (isCrew ? "crew" : "pilot")) {
        return {
          success: false,
          error: "Pilot/Crew roles lock after onboarding (Migration 064). Changes to role or account type are disabled for completed accounts. Someone needing both roles must use separate accounts with different emails.",
        };
      }
    }

    // 1. Update users table if role provided
    if (role) {
      await supabase
        .from("users")
        .update({
          role: isCrew ? "crew" : "pilot",
          professionalRole: isCrew ? "crew" : "pilot",
        })
        .eq("id", user.id);
    }

    // 2. Update user_profiles table
    const userProfileUpdate: Record<string, any> = {};
    if (role) {
      userProfileUpdate.role = isCrew ? "crew" : "pilot";
      userProfileUpdate.professionalRole = isCrew ? "crew" : "pilot";
    }
    if (dateOfBirth) userProfileUpdate.dateOfBirth = dateOfBirth;

    if (Object.keys(userProfileUpdate).length > 0) {
      try {
        await supabase
          .from("user_profiles")
          .update(userProfileUpdate)
          .eq("user_id", user.id);
      } catch (e) {
        console.warn("[savePersonalInfoAction] user_profiles update notice:", e);
      }
    }

    // 3. Update resumes table
    const { data: currentResume } = await supabase
      .from("resumes")
      .select("data")
      .eq("userId", user.id)
      .maybeSingle();

    const resumeData = (currentResume?.data as any) || {};
    const existingPersonal = resumeData.personal || {};

    const updatedPersonal: Record<string, any> = {
      ...existingPersonal,
      ...(role ? { role: isCrew ? "crew" : "pilot", professionalRole: isCrew ? "crew" : "pilot" } : {}),
      ...(employmentStatus ? { employmentStatus } : {}),
      ...(civilStatus ? { civilStatus } : {}),
      ...(dateOfBirth ? { dateOfBirth, dob: dateOfBirth } : {}),
      ...(children !== undefined ? { children } : {}),
    };

    // If switching to crew with safeguard enabled, purge incompatible pilot data
    if (isCrew && purgeIncompatibleData) {
      updatedPersonal.totalFlightHours = null;
      updatedPersonal.flightHours = null;
      updatedPersonal.flight_hours = null;
      updatedPersonal.licenses = [];
      updatedPersonal.licenseCertification = null;
    }

    const updatedResumeData: Record<string, any> = {
      ...resumeData,
      personal: updatedPersonal,
    };

    if (isCrew && purgeIncompatibleData) {
      updatedResumeData.licenses = [];
      updatedResumeData.ratings = [];
    }

    await supabase.from("resumes").upsert(
      {
        userId: user.id,
        data: updatedResumeData,
      },
      { onConflict: "userId" }
    );

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/onboarding");

    return {
      success: true,
      purged: isCrew && purgeIncompatibleData,
      role: role || existingPersonal.role,
    };
  } catch (err: any) {
    console.error("[savePersonalInfoAction] Error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving personal information.",
    };
  }
}

