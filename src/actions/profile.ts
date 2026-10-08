"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasInvalidCharacters } from "@/lib/validation/input-restrictions";
import { hasScriptInjection, TEXT_LIMITS, sanitizeAndClampText } from "@/lib/validation/text-limits";

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
