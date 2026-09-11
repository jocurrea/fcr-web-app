"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface BypassAffiliationInput {
  companyId: string;
  companyName?: string | null;
}

export interface BypassAffiliationResult {
  success: boolean;
  affiliationId?: string;
  message?: string;
  error?: string;
}

/**
 * Server Action for QA Bypass:
 * Directly inserts or updates a pending affiliation record in company_affiliations
 * using SUPABASE_SERVICE_ROLE_KEY, completely bypassing RLS and strict RPC rules.
 */
export async function bypassCompanyAffiliationAction(
  input: BypassAffiliationInput
): Promise<BypassAffiliationResult> {
  try {
    const { companyId, companyName } = input;

    if (!companyId) {
      return { success: false, error: "Company ID is required." };
    }

    // 1. Verify caller session
    const supabaseUser = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    // 2. Initialize privileged Admin Client with Service Role Key
    const admin = createAdminClient();

    const nowIso = new Date().toISOString();

    // Check if an affiliation record already exists between this user and this company
    const { data: existing } = await admin
      .from("company_affiliations")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateErr } = await admin
        .from("company_affiliations")
        .update({
          status: "pending",
          company_name_snapshot: (companyName || "").trim() || null,
          source: "self_request",
          requested_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateErr) {
        console.error("Error updating existing company_affiliations via admin:", updateErr);
        return { success: false, error: updateErr.message };
      }

      return {
        success: true,
        affiliationId: updated?.id || existing.id,
        message: "Affiliation request set to pending successfully (QA Bypass).",
      };
    }

    // 3. Direct INSERT with service role key (bypassing RLS and DB constraints)
    const { data: inserted, error: insertErr } = await admin
      .from("company_affiliations")
      .insert({
        user_id: user.id,
        company_id: companyId,
        company_name_snapshot: (companyName || "").trim() || null,
        status: "pending",
        source: "self_request",
        is_primary: false,
        requested_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Error inserting into company_affiliations via admin:", insertErr);
      return { success: false, error: insertErr.message };
    }

    return {
      success: true,
      affiliationId: inserted?.id,
      message: "Affiliation request created successfully (QA Bypass).",
    };
  } catch (err: any) {
    console.error("bypassCompanyAffiliationAction exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during bypass.",
    };
  }
}
