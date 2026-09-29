"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_SUMMARY_LENGTH = 500;

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
 * - Maximum character length: 500 chars (rejects anything exceeding limit)
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

    // 2. Backend validation: Character limit check
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


