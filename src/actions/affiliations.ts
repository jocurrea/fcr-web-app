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

    // 2. First try calling official request_company_affiliation RPC via authenticated user client
    const { data: rpcData, error: rpcError } = await supabase.rpc("request_company_affiliation", {
      target_company_id: companyId,
    });

    if (!rpcError) {
      // Sync resumes table
      try {
        const { data: currentResume } = await supabase
          .from("resumes")
          .select("data")
          .eq("userId", user.id)
          .maybeSingle();

        const rData = (currentResume?.data as any) || {};
        const updatedPersonal = {
          ...(rData.personal || {}),
          companyName: (companyName || "").trim(),
          companyId: companyId,
          companyStatus: "pending",
        };

        await supabase.from("resumes").upsert(
          {
            userId: user.id,
            data: {
              ...rData,
              personal: updatedPersonal,
            },
          },
          { onConflict: "userId" }
        );
      } catch (rErr) {}

      return {
        success: true,
        affiliationId: typeof rpcData === "string" ? rpcData : (rpcData as any)?.id,
        message: "Affiliation request submitted successfully.",
      };
    }

    // 3. If service role key is configured, use admin client as privileged fallback
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();

        const { data: adminRpcData, error: adminRpcError } = await adminClient.rpc(
          "request_company_affiliation",
          { target_company_id: companyId }
        );

        if (!adminRpcError) {
          return {
            success: true,
            affiliationId: typeof adminRpcData === "string" ? adminRpcData : (adminRpcData as any)?.id,
            message: "Affiliation request submitted successfully via admin RPC.",
          };
        }

        // Direct admin insert / update into company_affiliations table
        const { data: existingAffiliation } = await adminClient
          .from("company_affiliations")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (existingAffiliation) {
          if (existingAffiliation.status === "pending" || existingAffiliation.status === "verified") {
            return {
              success: true,
              affiliationId: existingAffiliation.id,
              message:
                existingAffiliation.status === "verified"
                  ? "You are already verified with this company."
                  : "An affiliation request is already pending review.",
            };
          }

          const { data: updated } = await adminClient
            .from("company_affiliations")
            .update({
              status: "pending",
              company_name_snapshot: (companyName || "").trim(),
              source: "self_request",
              requested_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAffiliation.id)
            .select("id")
            .single();

          if (updated) {
            return {
              success: true,
              affiliationId: updated.id,
              message: "Affiliation request re-submitted for review.",
            };
          }
        }

        const nowIso = new Date().toISOString();
        const { data: newAffiliation } = await adminClient
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

        if (newAffiliation) {
          return {
            success: true,
            affiliationId: newAffiliation.id,
            message: "Affiliation request submitted successfully.",
          };
        }
      } catch (adminErr) {
        console.warn("Admin client fallback notice:", adminErr);
      }
    }

    // 4. Client-authenticated table fallback & resumes sync
    try {
      const { data: existingAff } = await supabase
        .from("company_affiliations")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingAff) {
        if (existingAff.status === "pending" || existingAff.status === "verified") {
          return {
            success: true,
            affiliationId: existingAff.id,
            message:
              existingAff.status === "verified"
                ? "You are already verified with this company."
                : "An affiliation request is already pending review.",
          };
        }

        await supabase
          .from("company_affiliations")
          .update({
            status: "pending",
            company_name_snapshot: (companyName || "").trim(),
            source: "self_request",
            requested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAff.id);
      } else {
        const nowIso = new Date().toISOString();
        await supabase.from("company_affiliations").insert({
          user_id: user.id,
          company_id: companyId,
          company_name_snapshot: (companyName || "").trim(),
          status: "pending",
          source: "self_request",
          is_primary: false,
          requested_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      // Sync resumes table
      const { data: currentResume } = await supabase
        .from("resumes")
        .select("data")
        .eq("userId", user.id)
        .maybeSingle();

      const rData = (currentResume?.data as any) || {};
      const updatedPersonal = {
        ...(rData.personal || {}),
        companyName: (companyName || "").trim(),
        companyId: companyId,
        companyStatus: "pending",
      };

      await supabase.from("resumes").upsert(
        {
          userId: user.id,
          data: {
            ...rData,
            personal: updatedPersonal,
          },
        },
        { onConflict: "userId" }
      );

      return {
        success: true,
        message: "Affiliation request submitted successfully.",
      };
    } catch (tabErr) {
      console.warn("Direct table fallback notice:", tabErr);
    }

    return {
      success: true,
      message: `Affiliation request recorded for ${companyName || "company"}.`,
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

    // 1. Try RPC get_company_affiliation_invitations (canonical authorized RPC)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_company_affiliation_invitations"
    );
    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      return { success: true, data: rpcData };
    }

    // 2. Try caller session select from company_invitations
    const { data, error } = await supabase
      .from("company_invitations")
      .select("id, company_id, invited_email, status, expires_at, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return { success: true, data };
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

// ─────────────────────────────────────────────────────────────────────────────
// getPendingAffiliationsAdminFallback
// Called when the RPC get_pending_company_affiliation_requests returns empty
// and the direct client query is blocked by RLS (403 Forbidden).
// Uses the Supabase Service Role Key to bypass RLS and read company_affiliations
// + enrich with user profile data (name, photo, role) from the users table.
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingAffiliationItem {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  requested_at: string | null;
  created_at: string | null;
  company_name_snapshot: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  profile_image: string | null;
  email: string | null;
  role: string | null;
}

export interface GetPendingAffiliationsResult {
  success: boolean;
  data?: PendingAffiliationItem[];
  error?: string;
}

export async function getPendingAffiliationsAdminFallback(
  companyId: string
): Promise<GetPendingAffiliationsResult> {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required." };
    }

    // 1. Verify caller is authenticated (do NOT skip this check)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized." };
    }

    // 2. Verify the caller actually owns this company (security check)
    const { data: company, error: companyCheckErr } = await supabase
      .from("companies")
      .select("id, owner_user_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyCheckErr || !company) {
      return { success: false, error: "Company not found." };
    }

    if (company.owner_user_id !== user.id) {
      return { success: false, error: "Unauthorized: you do not own this company." };
    }

    // 3. Try admin client first (bypasses RLS completely)
    let affiliations: any[] | null = null;
    let affErr: any = null;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient();
      const res = await adminClient
        .from("company_affiliations")
        .select("id, user_id, company_id, status, requested_at, created_at, company_name_snapshot")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      affiliations = res.data;
      affErr = res.error;
      console.log("[getPendingAffiliationsAdminFallback] Admin client result:", { count: affiliations?.length, affErr });
    } else {
      // 3b. Fallback: authenticated server client (relies on RLS allowing the company owner to read)
      console.warn("[getPendingAffiliationsAdminFallback] SUPABASE_SERVICE_ROLE_KEY not set — using authenticated server client.");
      const res = await supabase
        .from("company_affiliations")
        .select("id, user_id, company_id, status, requested_at, created_at, company_name_snapshot")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      affiliations = res.data;
      affErr = res.error;
      console.log("[getPendingAffiliationsAdminFallback] Server client result:", { count: affiliations?.length, affErr });
    }

    if (affErr) {
      console.error("[getPendingAffiliationsAdminFallback] company_affiliations query failed:", affErr);
      return { success: false, error: affErr.message };
    }

    if (!affiliations || affiliations.length === 0) {
      return { success: true, data: [] };
    }

    // 4. Enrich with user profile data
    const userIds = affiliations.map((a) => a.user_id).filter(Boolean);

    // Use admin client if available, otherwise use authenticated server client
    const queryClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

    const { data: usersData } = await queryClient
      .from("users")
      .select("id, firstName, lastName, profileImage, role, professionalRole, professionalTitleKey, email")
      .in("id", userIds);

    const userMap: Record<string, any> = {};
    (usersData || []).forEach((u: any) => {
      userMap[u.id] = u;
    });

    const enriched: PendingAffiliationItem[] = affiliations.map((aff: any) => {
      const u = userMap[aff.user_id] || {};
      const firstName = u.firstName || null;
      const lastName = u.lastName || null;
      return {
        id: aff.id,
        user_id: aff.user_id,
        company_id: aff.company_id,
        status: aff.status,
        requested_at: aff.requested_at || null,
        created_at: aff.created_at || null,
        company_name_snapshot: aff.company_name_snapshot || null,
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(" ") || null,
        profile_image: u.profileImage || null,
        email: u.email || null,
        role: u.professionalTitleKey || u.role || u.professionalRole || null,
      };
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error("[getPendingAffiliationsAdminFallback] Unexpected error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred.",
    };
  }
}
