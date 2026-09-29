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

