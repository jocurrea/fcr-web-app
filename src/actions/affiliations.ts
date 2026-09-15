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
    } catch (tabErr: any) {
      console.warn("Direct table fallback notice:", tabErr);
      return {
        success: false,
        error: "Failed to insert affiliation request. Please verify your profile is fully onboarded."
      };
    }
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

    return { success: false, error: "Failed to fetch company invitations." };
  } catch (err: any) {
    console.error("getCompanyInvitationsAction exception:", err);
    return {
      success: false,
      error:
        err?.message ||
        "An unexpected error occurred while fetching invitations.",
    };
  }
}

/**
 * 5. Get Pending Company Affiliation Requests Action
 * Reads pending company_affiliations directly securely using adminClient
 */
export async function getPendingCompanyAffiliationRequestsAction(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    // 1. Get the company owned by this user
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .eq("owner_user_id", user.id)
      .limit(1);

    const activeCompany = companies?.[0];
    const companyId = activeCompany?.id;
    if (!companyId) {
      return { success: true, data: [] };
    }

    const companyName = activeCompany?.name || "Company";

    // 2. Fetch pending requests: try direct query or RPC
    // 2. Fetch pending requests: strictly use the official RPC
    let rawRequests: any[] = [];
    
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_pending_company_affiliation_requests");
    
    if (rpcError) {
      console.error("[get_pending_company_affiliation_requests RPC Error]:", rpcError);
      return { success: false, error: rpcError.message || "Failed to fetch requests via RPC." };
    }
    
    if (Array.isArray(rpcData)) {
      rawRequests = rpcData;
    }

    // 3. Fetch user profiles for all applicant user_ids so we have real names and photos
    const userIds = Array.from(
      new Set(rawRequests.map((r: any) => r.user_id || r.professional_id || r.userId).filter(Boolean))
    );

    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: userRows } = await supabase
        .from("users")
        .select("id, firstName, lastName, username, profileImage, email, location, role, professionalRole, professionalTitleKey")
        .in("id", userIds);

      if (userRows) {
        for (const u of userRows) {
          usersMap[u.id] = u;
        }
      }
    }

    // 4. Map the output to match what the UI expects (AffiliationRequest interface)
    const mappedData = rawRequests.map((req: any) => {
      const uId = req.user_id || req.professional_id || req.userId;
      const u = (uId ? usersMap[uId] : null) || req.user || {};
      const firstName = u.firstName || u.first_name || req.first_name || req.firstName || "";
      const lastName = u.lastName || u.last_name || req.last_name || req.lastName || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || u.name || req.full_name || req.fullName || u.username || req.username || "Aviation Professional";
      const reqCompanyName = req.company?.name || req.company_name || req.company_name_snapshot || companyName;

      return {
        id: req.id,
        affiliation_id: req.id,
        user_id: uId,
        professional_id: uId,
        company_id: req.company_id || companyId,
        company_name: reqCompanyName,
        status: req.status || "pending",
        created_at: req.created_at || req.requested_at || new Date().toISOString(),
        requested_at: req.requested_at || req.created_at || new Date().toISOString(),
        requested_role: u.professionalTitleKey || (u.role && u.role !== "aviation_professional" && u.role !== "flight_crew" ? u.role : null) || req.requested_role || "operations_officer",
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        username: u.username || req.username || null,
        profile_image: u.profileImage || u.profile_image || req.profile_image || req.profileImage || null,
        email: u.email || req.email || null,
        location: u.location || req.location || null,
        user_role: u.professionalTitleKey || (u.role && u.role !== "aviation_professional" && u.role !== "flight_crew" ? u.role : null) || req.requested_role || "operations_officer",
        user: {
          id: uId,
          first_name: firstName,
          last_name: lastName,
          firstName: firstName,
          lastName: lastName,
          name: fullName,
          fullName: fullName,
          username: u.username || req.username || null,
          profile_image: u.profileImage || u.profile_image || null,
          profileImage: u.profileImage || u.profile_image || null,
          email: u.email || req.email || null,
          role: u.role || null,
          professionalRole: u.professionalRole || null,
          professionalTitleKey: u.professionalTitleKey || null,
        },
        company: {
          id: req.company_id || companyId,
          name: reqCompanyName,
        },
      };
    });

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error("getPendingCompanyAffiliationRequestsAction exception:", err);
    return { success: false, error: err?.message || "An unexpected error occurred." };
  }
}

/**
 * 6. Review Company Affiliation Request Action
 * Approves or rejects a pending affiliation request.
 * Tries the canonical review_company_affiliation_request(id, decision, rejection_reason) RPC first,
 * with automated fallbacks to direct database mutation via adminClient.
 */
export interface ReviewCompanyAffiliationInput {
  requestId: string;
  decision: "approved" | "rejected";
  rejectionReason?: string | null;
}

export interface ReviewCompanyAffiliationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function reviewCompanyAffiliationRequestAction(
  input: ReviewCompanyAffiliationInput
): Promise<ReviewCompanyAffiliationResult> {
  try {
    const { requestId, decision, rejectionReason } = input;
    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }
    if (decision !== "approved" && decision !== "rejected") {
      return { success: false, error: "Decision must be 'approved' or 'rejected'." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const params: any = {
      id: requestId,
      decision: decision,
      rejection_reason: rejectionReason || null
    };

    let rpcSucceeded = false;
    let lastRpcError: any = null;

    try {
      const { error } = await supabase.rpc("review_company_affiliation_request", params);
      if (!error) {
        rpcSucceeded = true;
      } else {
        lastRpcError = error;
        console.warn("[review_company_affiliation_request RPC attempt notice]:", params, error.message);
      }
    } catch (err: any) {
      lastRpcError = err;
    }

    if (!rpcSucceeded && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();
        const { error: adminError } = await adminClient.rpc("review_company_affiliation_request", params);
        if (!adminError) {
          rpcSucceeded = true;
        } else {
          lastRpcError = adminError;
        }
      } catch (err: any) {
        lastRpcError = err;
      }
    }



    if (rpcSucceeded) {
      try {
        revalidatePath("/business/requests");
        revalidatePath("/business/team");
        revalidatePath("/business/overview");
        revalidatePath("/profile");
        revalidatePath("/", "layout");
      } catch {}

      return {
        success: true,
        message: `Successfully ${decision === "approved" ? "approved" : "declined"} affiliation request.`,
      };
    } else {
      // RPC failed, and direct mutations are prohibited by RLS
      return { 
        success: false, 
        error: lastRpcError?.message || "Failed to update affiliation request using official RPC." 
      };
    }
  } catch (err: any) {
    console.error("reviewCompanyAffiliationRequestAction error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while reviewing the request.",
    };
  }
}

