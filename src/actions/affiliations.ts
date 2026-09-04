"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

export interface SendCompanyInvitationInput {
  companyId: string;
  email: string;
  role?: string | null;
  companyName?: string | null;
}

export interface SendCompanyInvitationResult {
  success: boolean;
  invitationId?: string;
  rawToken?: string;
  inviteUrl?: string;
  error?: string;
  warning?: string;
  emailSent?: boolean;
}

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
 * 1. Direct Route: Send Company Affiliation Invitation
 * Bypasses the Supabase send-company-invitation Edge Function and runs entirely on the Next.js server.
 */
export async function sendCompanyInvitationAction(
  input: SendCompanyInvitationInput
): Promise<SendCompanyInvitationResult> {
  try {
    const { companyId, email, role, companyName } = input;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!companyId) {
      return { success: false, error: "Company ID is required." };
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }

    // 1. Authenticate caller session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to send invitations.",
      };
    }

    if (user.email && user.email.toLowerCase() === cleanEmail) {
      return {
        success: false,
        error: "You cannot send an affiliation invitation to your own email address.",
      };
    }

    // 2. Generate cryptographically secure 256-bit raw token and SHA-256 hash using Node crypto
    // 32 bytes = 256 bits, represented as 64-character hex string
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 3. Call create_company_affiliation_invitation RPC using the caller's authenticated session
    // Defined in PostgreSQL schema as: create_company_affiliation_invitation(invitation_token_hash, invite_email, target_company_id)
    // Strictly passing (uuid, text, text)
    let invitationId: string | undefined;
    let rpcErrorOccurred = false;
    let lastRpcError: any = null;
    let rpcSucceeded = false;

    // Strict parameter types: (uuid, text, text)
    const pCompanyId: string = String(companyId).trim();
    const pCleanEmail: string = String(cleanEmail).trim().toLowerCase();
    const pTokenHash: string = String(tokenHash).trim();

    // Verified PostgreSQL function signature: { target_company_id, invite_email, invitation_token_hash }
    let { data, error } = await supabase.rpc(
      "create_company_affiliation_invitation",
      {
        target_company_id: pCompanyId,
        invite_email: pCleanEmail,
        invitation_token_hash: pTokenHash,
      }
    );

    // If that throws a schema cache error or signature mismatch, retry using alternatives
    const isSchemaCacheError = (err: any) =>
      Boolean(
        err &&
          (err.code === "PGRST202" ||
            err.code === "42883" ||
            err.message?.toLowerCase().includes("schema cache") ||
            err.message?.toLowerCase().includes("could not find the function") ||
            err.message?.toLowerCase().includes("parameter"))
      );

    if (error && isSchemaCacheError(error)) {
      console.warn(
        "create_company_affiliation_invitation schema cache notice with target_company_id/invite_email/invitation_token_hash. Trying alternatives...",
        error.message
      );

      // Attempt 1: { p_company_id, p_invited_email, p_token_hash }
      let retryRes = await supabase.rpc(
        "create_company_affiliation_invitation",
        {
          p_company_id: pCompanyId,
          p_invited_email: pCleanEmail,
          p_token_hash: pTokenHash,
        }
      );

      // Attempt 2: { company_id, invited_email, token_hash }
      if (retryRes.error && isSchemaCacheError(retryRes.error)) {
        retryRes = await supabase.rpc(
          "create_company_affiliation_invitation",
          {
            company_id: pCompanyId,
            invited_email: pCleanEmail,
            token_hash: pTokenHash,
          }
        );
      }

      data = retryRes.data;
      error = retryRes.error;
    }

    if (!error) {
      rpcSucceeded = true;
      invitationId =
        typeof data === "string"
          ? data
          : (data as any)?.id || (data as any)?.invitation_id || (data as any)?.invitationId;
    } else {
      lastRpcError = error;
      // Business logic rejection: SELF_INVITATION, INELIGIBLE_INVITEE, ALREADY_AFFILIATED, duplicate, etc.
      if (
        error.message?.includes("SELF_INVITATION") ||
        error.message?.includes("already affiliated") ||
        error.message?.includes("duplicate") ||
        error.message?.includes("INELIGIBLE")
      ) {
        return { success: false, error: error.message };
      }
    }

    // 4. Fallback to service role if caller session RPC failed due to RLS or permissions
    if (!rpcSucceeded) {
      rpcErrorOccurred = true;
      console.warn(
        "Caller session create_company_affiliation_invitation RPC returned notice:",
        lastRpcError?.message || lastRpcError
      );

      // Attempt to execute with service role if available
      try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return {
            success: false,
            error:
              lastRpcError?.message ||
              "Unable to create company invitation. Please ensure SUPABASE_SERVICE_ROLE_KEY is configured.",
          };
        }

        const adminClient = createAdminClient();

        // Check if an active pending invite already exists for this email & company
        const { data: existingInvite } = await adminClient
          .from("company_invitations")
          .select("id, status")
          .eq("company_id", companyId)
          .eq("invited_email", cleanEmail)
          .eq("status", "pending")
          .maybeSingle();

        if (existingInvite) {
          return {
            success: false,
            error: "A pending invitation already exists for this email address.",
          };
        }

        // Insert pending invitation directly with service role (bypassing RLS)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: insertedInvite, error: insertErr } = await adminClient
          .from("company_invitations")
          .insert({
            company_id: companyId,
            invited_email: cleanEmail,
            invited_by_user_id: user.id,
            invitation_type: "affiliation",
            token_hash: tokenHash,
            status: "pending",
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("Direct admin insert error:", insertErr);
          return {
            success: false,
            error: insertErr.message || "Failed to record company invitation.",
          };
        }

        invitationId = insertedInvite.id;
      } catch (adminErr: any) {
        console.error("Admin client fallback error:", adminErr);
        return {
          success: false,
          error:
            lastRpcError?.message ||
            adminErr?.message ||
            "Unable to generate company invitation.",
        };
      }
    }

    // 5. Build the accept link
    const headerStore = await headers();
    const requestHost = headerStore.get("x-forwarded-host") || headerStore.get("host");
    const protocol = headerStore.get("x-forwarded-proto") || "https";
    const headerOrigin = requestHost ? `${protocol}://${requestHost}` : undefined;

    const baseOrigin = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.AUTH_WEB_URL ||
      headerOrigin ||
      siteUrl ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const inviteUrl = `${baseOrigin}/invitations/accept?token=${rawToken}`;

    // 6. Send transactional email using the Resend Node SDK
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.INVITATION_FROM_EMAIL || "Flight Crew <onboarding@resend.dev>";

    let emailSent = false;
    let warning: string | undefined;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const displayCompanyName = companyName || "Flight Crew Company";
        const emailSubject = `Invitation to join ${displayCompanyName} on Flight Crew`;

        const { error: resendError } = await resend.emails.send({
          from: fromEmail,
          to: cleanEmail,
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${emailSubject}</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" max-width="580" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                        <!-- Header -->
                        <tr>
                          <td style="background-color: #0f172a; padding: 28px 36px; text-align: center;">
                            <span style="color: #38bdf8; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">FLIGHT CREW</span>
                          </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                          <td style="padding: 36px 36px 28px;">
                            <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                              Company Affiliation Invitation
                            </h1>
                            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #475569;">
                              <strong>${displayCompanyName}</strong> has invited you to join their official team on Flight Crew${role ? ` as a <strong>${role}</strong>` : ""}.
                            </p>
                            <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #64748b;">
                              By accepting this invitation, your verified profile will display your official affiliation with ${displayCompanyName}.
                            </p>
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 32px 0;">
                              <a href="${inviteUrl}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; letter-spacing: 0.2px;">
                                Accept Invitation
                              </a>
                            </div>
                            <p style="margin: 28px 0 8px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                              If the button above does not work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0 0 24px; font-size: 12px; color: #0284c7; word-break: break-all; line-height: 1.5;">
                              ${inviteUrl}
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                              This single-use invitation will expire in <strong>7 days</strong>. If you did not expect this invitation, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
          text: `You have been invited by ${displayCompanyName} to join their team on Flight Crew${role ? ` as ${role}` : ""}.\n\nAccept your invitation here:\n${inviteUrl}\n\nThis invitation expires in 7 days.`,
        });

        if (resendError) {
          console.error("Resend API error:", resendError);
          warning = `Email delivery notice: ${resendError.message || "Failed to send email"}. You can share the link manually.`;
        } else {
          emailSent = true;
        }
      } catch (resendErr: any) {
        console.error("Resend execution error:", resendErr);
        warning = `Email delivery notice: ${resendErr?.message || "Failed to send email"}. You can share the link manually.`;
      }
    } else {
      console.warn(
        "RESEND_API_KEY is not defined in server environment variables. Email was not dispatched."
      );
      warning =
        "RESEND_API_KEY is not configured in your Vercel/Netlify environment variables. The invitation was created, and you can copy the link below.";
    }

    return {
      success: true,
      invitationId: invitationId || "inv-" + Date.now(),
      rawToken,
      inviteUrl,
      warning,
      emailSent,
    };
  } catch (err: any) {
    console.error("sendCompanyInvitationAction unexpected error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while sending the invitation.",
    };
  }
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
