"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Building2,
  Mail,
  Send,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  sendCompanyInvitationAction,
  revokeCompanyInvitationAction,
  getCompanyInvitationsAction,
} from "@/actions/affiliations";

interface SentInvitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "expired" | "revoked";
  created_at: string;
  expires_at?: string | null;
  role?: string;
}

const MONTHS_ES = [
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sep.",
  "oct.",
  "nov.",
  "dic.",
];

/**
 * Safely parses any Supabase/SQL timestamp or ISO string into a valid Date object.
 */
function parseValidDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "Invalid Date") return null;

    // Convert SQL timestamp string 'YYYY-MM-DD HH:mm:ss' to ISO format
    const normalized =
      trimmed.includes(" ") && !trimmed.includes("T")
        ? trimmed.replace(" ", "T")
        : trimmed;

    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;

    const dRaw = new Date(trimmed);
    if (!isNaN(dRaw.getTime())) return dRaw;

    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      const dNum = new Date(num);
      if (!isNaN(dNum.getTime())) return dNum;
    }
  }
  return null;
}

/**
 * Formats a date into the required localized format: '11 de sep. de 2026'
 */
function formatDateDisplay(val: any, fallbackDate?: any): string {
  let date = parseValidDate(val);
  if (!date && fallbackDate) {
    date = parseValidDate(fallbackDate);
  }
  if (!date) {
    date = new Date();
  }

  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}

export default function BusinessInvitationsPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState<string>("Company");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [invitations, setInvitations] = useState<SentInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Revocation modal state
  const [selectedInvitation, setSelectedInvitation] =
    useState<SentInvitation | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load invitations using company_invitations table (with expires_at)
  const loadInvitations = useCallback(async (targetCompanyId: string) => {
    try {
      let invRecords: any[] = [];

      // 1. Direct query from company_invitations table
      const { data: directData, error: directErr } = await supabase
        .from("company_invitations")
        .select("id, company_id, invited_email, status, expires_at, created_at")
        .eq("company_id", targetCompanyId)
        .order("created_at", { ascending: false });

      if (!directErr && directData && directData.length > 0) {
        invRecords = directData;
      } else {
        // 2. Server Action getCompanyInvitationsAction fallback
        const serverRes = await getCompanyInvitationsAction(targetCompanyId);
        if (serverRes.success && serverRes.data && serverRes.data.length > 0) {
          invRecords = serverRes.data;
        } else if (!directErr && directData) {
          invRecords = directData;
        } else {
          // 3. Fallback: get_company_affiliation_invitations RPC
          const { data: rpcData, error: rpcErr } = await supabase.rpc(
            "get_company_affiliation_invitations"
          );
          if (!rpcErr && Array.isArray(rpcData)) {
            invRecords = rpcData;
          }
        }
      }

      if (invRecords && invRecords.length > 0) {
        setInvitations(
          invRecords.map((inv: any) => ({
            id: inv.id,
            email: inv.invited_email || inv.email || "professional@example.com",
            status: inv.status || "pending",
            created_at: inv.created_at,
            expires_at: inv.expires_at || null,
            role: inv.role,
          }))
        );
      } else {
        const localInv = localStorage.getItem(
          `company_invitations_${targetCompanyId}`
        );
        if (localInv) {
          setInvitations(JSON.parse(localInv));
        } else {
          setInvitations([]);
        }
      }
    } catch (e) {
      console.warn("Failed to load invitations:", e);
      const localInv = localStorage.getItem(
        `company_invitations_${targetCompanyId}`
      );
      if (localInv) {
        setInvitations(JSON.parse(localInv));
      }
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadCompanyAndInvitations() {
      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/welcome");
          return;
        }

        // Fetch company owned by this user
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .eq("owner_user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (companies && companies.length > 0) {
          setCompanyName(companies[0].name || "Company");
          setCompanyId(companies[0].id);

          await loadInvitations(companies[0].id);
        }
      } catch (err) {
        console.error("Error loading company invitations:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanyAndInvitations();
  }, [router, loadInvitations]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Security Check: Prevent self-invitation
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!companyId) {
        setErrorMessage(
          "Active company profile not found. Please ensure your business profile is set up."
        );
        setIsSending(false);
        return;
      }

      if (
        session?.user?.email &&
        session.user.email.toLowerCase() === cleanEmail
      ) {
        setErrorMessage(
          "You cannot send an affiliation invitation to your own business account email address."
        );
        setIsSending(false);
        return;
      }

      // 2. Duplicate Prevention: Check if there is already a pending invitation for this email
      const alreadyPending = invitations.some(
        (inv) =>
          inv.email.toLowerCase() === cleanEmail && inv.status === "pending"
      );
      if (alreadyPending) {
        setErrorMessage(
          "A pending invitation has already been sent to this email address."
        );
        setIsSending(false);
        return;
      }

      // 3. Dispatch via Next.js Server Action (strictly email-bound, role chosen by recipient on onboarding)
      const actionRes = await sendCompanyInvitationAction({
        companyId,
        email: cleanEmail,
        companyName,
      });

      if (!actionRes.success) {
        setErrorMessage(
          actionRes.error ||
            "Fallo al enviar el correo. Verifica las credenciales del servidor."
        );
        setIsSending(false);
        return;
      }

      const defaultExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const newInvitation: SentInvitation = {
        id: actionRes.invitationId || "inv-" + Date.now(),
        email: cleanEmail,
        status: "pending",
        created_at: new Date().toISOString(),
        expires_at: defaultExpiresAt,
      };

      const updatedList = [
        newInvitation,
        ...invitations.filter((i) => i.email !== cleanEmail),
      ];
      setInvitations(updatedList);
      if (companyId) {
        localStorage.setItem(
          `company_invitations_${companyId}`,
          JSON.stringify(updatedList)
        );
        await loadInvitations(companyId);
      }

      setInviteEmail("");
      setSuccessMessage(
        `Invitación enviada exitosamente por correo electrónico a ${cleanEmail}.`
      );
    } catch (err: any) {
      console.error("Error sending invitation:", err);
      setErrorMessage(
        err?.message || "Failed to create invitation. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  // Open revoke confirmation modal
  const handleOpenRevokeModal = (inv: SentInvitation) => {
    setSelectedInvitation(inv);
    setIsRevokeModalOpen(true);
  };

  // Close revoke confirmation modal
  const handleCloseRevokeModal = () => {
    if (isRevoking) return;
    setIsRevokeModalOpen(false);
    setSelectedInvitation(null);
  };

  // Confirm revocation
  const handleConfirmRevoke = async () => {
    if (!selectedInvitation) return;
    setIsRevoking(true);
    setErrorMessage(null);

    const targetId = selectedInvitation.id;
    const targetEmail = selectedInvitation.email;

    try {
      // 1. Database Action: Call the official Supabase RPC revoke_company_affiliation_invitation(invitation_id)
      // using the authenticated company owner's session
      let rpcSuccess = false;
      let rpcErr: any = null;

      try {
        const res1 = await supabase.rpc(
          "revoke_company_affiliation_invitation",
          {
            invitation_id: targetId,
          }
        );
        if (!res1.error) {
          rpcSuccess = true;
        } else {
          rpcErr = res1.error;
          const res2 = await supabase.rpc(
            "revoke_company_affiliation_invitation",
            {
              p_invitation_id: targetId,
            }
          );
          if (!res2.error) {
            rpcSuccess = true;
          } else {
            const res3 = await supabase.rpc(
              "revoke_company_affiliation_invitation",
              {
                id: targetId,
              }
            );
            if (!res3.error) {
              rpcSuccess = true;
            }
          }
        }
      } catch (clientRpcErr: any) {
        rpcErr = clientRpcErr;
      }

      // 2. Also invoke Server Action for revalidation and database synchronization
      const serverActionRes = await revokeCompanyInvitationAction(targetId);

      if (!rpcSuccess && !serverActionRes.success) {
        throw new Error(
          serverActionRes.error ||
            rpcErr?.message ||
            "Failed to revoke invitation."
        );
      }

      // 3. State Refresh: Close modal immediately
      setIsRevokeModalOpen(false);
      setSelectedInvitation(null);

      // 4. Update UI immediately so the revoked invitation disappears from the 'Pending' view
      setInvitations((prev) =>
        prev.map((item) =>
          item.id === targetId ? { ...item, status: "revoked" as const } : item
        )
      );

      setSuccessMessage(`Invitation to ${targetEmail} has been revoked.`);

      // 5. Invalidate Next.js cache and refetch from DB
      router.refresh();
      if (companyId) {
        await loadInvitations(companyId);
      }
    } catch (err: any) {
      console.error("Error revoking company invitation:", err);
      setErrorMessage(
        err?.message || "Failed to revoke invitation. Please try again."
      );
    } finally {
      setIsRevoking(false);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 sm:px-0 py-6 md:py-8 gap-5">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200/80 flex items-center justify-center text-gray-700 shadow-2xs transition-colors cursor-pointer shrink-0"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
            Invitations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Invite verified professionals to join and link with your company.
          </p>
        </div>
      </div>

      {/* Company Tag / Chip */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200/80 text-xs font-bold text-gray-900 shadow-2xs w-fit">
        <Building2 className="w-4 h-4 text-[#1d4ed8]" />
        <span>{companyName}</span>
      </div>

      {/* 1. Invite Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs flex flex-col gap-4">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-gray-900">
            Invite professionals
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
            Invite a Pilot, Crew member, or Aviation Professional. Accepted
            invitations are verified automatically.
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                {successMessage}
              </span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="p-1 text-emerald-500 hover:text-emerald-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form without Role Dropdown */}
        <form onSubmit={handleSendInvitation} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="professional@example.com"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1d4ed8] focus:bg-white focus:ring-1 focus:ring-[#1d4ed8] transition-all"
              />
            </div>
          </div>

          {/* Restored Input Footer: Padlock icon with 'Email must match' and clock icon with 'Expires in 7 days' */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1d4ed8] text-[11px] font-semibold border border-blue-100/80">
              <Lock className="w-3 h-3" />
              Email must match
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1d4ed8] text-[11px] font-semibold border border-blue-100/80">
              <Clock className="w-3 h-3" />
              Expires in 7 days
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSending || !inviteEmail.trim()}
            className="w-full py-3.5 rounded-full font-bold text-white text-xs sm:text-sm bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-[#85b0fa] disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send invitation</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. Invitations List Card (Tabs removed, restored 'X pending' in orange) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base sm:text-lg text-gray-900">
            Invitations
          </h2>
          <span className="text-xs sm:text-sm font-semibold text-orange-500">
            {pendingInvitations.length} pending
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1d4ed8]" />
            <p className="text-xs text-gray-400">Loading invitations...</p>
          </div>
        ) : pendingInvitations.length === 0 ? (
          /* Empty State */
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1d4ed8] shadow-2xs mb-1">
              <Mail className="w-8 h-8 text-[#1d4ed8]" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                No invitations sent
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                New invitations will appear here.
              </p>
            </div>
          </div>
        ) : (
          /* Populated List */
          <div className="space-y-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {inv.email}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-800">
                      {inv.status}
                    </span>
                  </div>
                  {/* Sent on date with robust parsing */}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Sent on {formatDateDisplay(inv.created_at)}
                  </p>
                  {/* Expiration Date: new line below 'Sent on' formatted like '11 de sep. de 2026' */}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Expires{" "}
                    {formatDateDisplay(
                      inv.expires_at,
                      (parseValidDate(inv.created_at)?.getTime() ??
                        Date.now()) +
                        7 * 24 * 60 * 60 * 1000
                    )}
                  </p>
                </div>

                {/* Red 'Revoke' text button to the right side of each pending invitation card */}
                <button
                  type="button"
                  onClick={() => handleOpenRevokeModal(inv)}
                  className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer px-2 py-1 shrink-0"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Confirmation Modal (AlertDialog) */}
      {isRevokeModalOpen && selectedInvitation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
          aria-describedby="revoke-modal-desc"
          onClick={handleCloseRevokeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 relative border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="revoke-modal-title"
                  className="text-base sm:text-lg font-bold text-gray-900 leading-snug"
                >
                  Revoke invitation?
                </h3>
                <p
                  id="revoke-modal-desc"
                  className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed"
                >
                  {selectedInvitation.email} will no longer be able to accept
                  this invitation.
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCloseRevokeModal}
                disabled={isRevoking}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRevoking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                REVOKE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
