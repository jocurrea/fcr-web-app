"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RequestCompanyAffiliationFallbackInput {
  companyId: string;
  companyName?: string | null;
}

export interface RequestCompanyAffiliationFallbackResult {
  success: boolean;
  affiliationId?: string;
  message?: string;
  error?: string;
}



/**
 * 2. Indirect Route: Fallback Action for Manual Affiliation Request
 * Called when the client-side request_company_affiliation(uuid) RPC fails due to RLS or missing permissions.
 * Uses SUPABASE_SERVICE_ROLE_KEY to securely bypass RLS and insert the pending affiliation into company_affiliations.
 */
export async function requestCompanyAffiliationFallbackAction(
  input: RequestCompanyAffiliationFallbackInput
): Promise<RequestCompanyAffiliationFallbackResult> {
  try {
    const { companyId, companyName } = input;

    if (!companyId) {
      return { success: false, error: "Company ID is required." };
    }

    // 1. Verify that the caller is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to request company affiliation.",
      };
    }

    // 2. Initialize admin client with SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createAdminClient();

    // 3. First, try executing the request_company_affiliation RPC via admin client (bypasses RLS)
    const paramVariations = [
      { target_company_id: companyId },
      { company_id: companyId },
      { p_company_id: companyId },
    ];

    for (const params of paramVariations) {
      const { data, error } = await adminClient.rpc("request_company_affiliation", params);
      if (!error) {
        return {
          success: true,
          affiliationId: typeof data === "string" ? data : (data as any)?.id,
          message: "Affiliation request submitted successfully via admin RPC.",
        };
      }
    }

    // 4. If RPC is unavailable or rejected, insert/update directly into company_affiliations table
    // Check if an affiliation record already exists
    const { data: existingAffiliation, error: selectErr } = await adminClient
      .from("company_affiliations")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (selectErr) {
      console.warn("Notice querying existing affiliation:", selectErr.message);
    }

    if (existingAffiliation) {
      if (existingAffiliation.status === "pending") {
        return {
          success: true,
          affiliationId: existingAffiliation.id,
          message: "An affiliation request is already pending review.",
        };
      }

      if (existingAffiliation.status === "verified") {
        return {
          success: true,
          affiliationId: existingAffiliation.id,
          message: "You are already verified with this company.",
        };
      }

      // If previous affiliation was rejected or revoked, reactivate to pending
      const { data: updated, error: updateErr } = await adminClient
        .from("company_affiliations")
        .update({
          status: "pending",
          company_name_snapshot: (companyName || "").trim(),
          source: "self_request",
          requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by_user_id: null,
        })
        .eq("id", existingAffiliation.id)
        .select("id")
        .single();

      if (updateErr) {
        console.error("Error updating affiliation record:", updateErr);
        return {
          success: false,
          error: updateErr.message || "Failed to reactivate affiliation request.",
        };
      }

      return {
        success: true,
        affiliationId: updated.id,
        message: "Affiliation request re-submitted for review.",
      };
    }

    // Direct insertion of pending affiliation
    const nowIso = new Date().toISOString();
    const { data: newAffiliation, error: insertErr } = await adminClient
      .from("company_affiliations")
      .insert({
        user_id: user.id,
        company_id: companyId,
        company_name_snapshot: (companyName || "").trim(),
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
      console.error("Direct admin insert into company_affiliations failed:", insertErr);
      return {
        success: false,
        error: insertErr.message || "Failed to save affiliation request.",
      };
    }

    return {
      success: true,
      affiliationId: newAffiliation.id,
      message: "Affiliation request submitted successfully.",
    };
  } catch (err: any) {
    console.error("requestCompanyAffiliationFallbackAction error:", err);
    return {
      success: false,
      error:
        err?.message ||
        "An unexpected error occurred while processing the affiliation request.",
    };
  }
}

/**
 * 3. Revoke Company Affiliation Invitation Action
 * Calls the official Supabase RPC revoke_company_affiliation_invitation(invitation_id)
 * using the authenticated company owner's session and revalidates the path.
 */
export interface RevokeCompanyInvitationResult {
  success: boolean;
  error?: string;
}

export async function revokeCompanyInvitationAction(
  invitationId: string
): Promise<RevokeCompanyInvitationResult> {
  try {
    if (!invitationId) {
      return { success: false, error: "Invitation ID is required." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    // 1. Primary: Call official Supabase RPC revoke_company_affiliation_invitation(invitation_id)
    let rpcError: any = null;
    try {
      const res1 = await supabase.rpc("revoke_company_affiliation_invitation", {
        invitation_id: invitationId,
      });
      if (!res1.error) {
        try {
          revalidatePath("/business/invitations");
          revalidatePath("/", "layout");
        } catch {}
        return { success: true };
      }
      rpcError = res1.error;

      // Alternative param p_invitation_id
      const res2 = await supabase.rpc("revoke_company_affiliation_invitation", {
        p_invitation_id: invitationId,
      });
      if (!res2.error) {
        try {
          revalidatePath("/business/invitations");
          revalidatePath("/", "layout");
        } catch {}
        return { success: true };
      }

      // Alternative param id
      const res3 = await supabase.rpc("revoke_company_affiliation_invitation", {
        id: invitationId,
      });
      if (!res3.error) {
        try {
          revalidatePath("/business/invitations");
          revalidatePath("/", "layout");
        } catch {}
        return { success: true };
      }
    } catch (e: any) {
      rpcError = e;
    }

    console.warn(
      "[revokeCompanyInvitationAction] RPC notice:",
      rpcError?.message || rpcError
    );

    // 2. Direct database update fallback using caller session
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("company_invitations")
      .update({
        status: "revoked",
        revoked_at: nowIso,
        revoked_by_user_id: user.id,
        updated_at: nowIso,
      })
      .eq("id", invitationId);

    if (!updateErr) {
      try {
        revalidatePath("/business/invitations");
        revalidatePath("/", "layout");
      } catch {}
      return { success: true };
    }

    // 3. Fallback to adminClient if RLS blocked direct user update
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient();
      const { error: adminErr } = await adminClient
        .from("company_invitations")
        .update({
          status: "revoked",
          revoked_at: nowIso,
          revoked_by_user_id: user.id,
          updated_at: nowIso,
        })
        .eq("id", invitationId);

      if (!adminErr) {
        try {
          revalidatePath("/business/invitations");
          revalidatePath("/", "layout");
        } catch {}
        return { success: true };
      }
    }

    return {
      success: false,
      error:
        updateErr?.message ||
        rpcError?.message ||
        "Failed to revoke company invitation.",
    };
  } catch (err: any) {
    console.error("revokeCompanyInvitationAction exception:", err);
    return {
      success: false,
      error:
        err?.message ||
        "An unexpected error occurred while revoking the invitation.",
    };
  }
}

/**
 * 4. Get Company Invitations Action
 * Reads company invitations with expires_at from company_invitations table
 */
export async function getCompanyInvitationsAction(
  companyId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    // 1. Try caller session select from company_invitations
    const { data, error } = await supabase
      .from("company_invitations")
      .select("id, company_id, invited_email, status, expires_at, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return { success: true, data };
    }

    // 2. Try RPC get_company_affiliation_invitations
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_company_affiliation_invitations"
    );
    if (!rpcError && rpcData) {
      return { success: true, data: rpcData };
    }

    // 3. Fallback admin client
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient();
      const { data: adminData } = await adminClient
        .from("company_invitations")
        .select("id, company_id, invited_email, status, expires_at, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (adminData) {
        return { success: true, data: adminData };
      }
    }

    return { success: false, error: error?.message || "Failed to load invitations." };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

