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
  ShieldCheck,
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

export default function BusinessInvitationsPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState<string>("Company");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Aviation Professional");
  const [isSending, setIsSending] = useState(false);
  const [invitations, setInvitations] = useState<SentInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab filter: "pending" by default
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

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

      // 1. Direct query from company_invitations table (using expires_at column directly)
      const { data: directData, error: directErr } = await supabase
        .from("company_invitations")
        .select("id, company_id, invited_email, status, expires_at, created_at")
        .eq("company_id", targetCompanyId)
        .order("created_at", { ascending: false });

      if (!directErr && directData && directData.length > 0) {
        invRecords = directData;
      } else {
        // 2. Try Server Action getCompanyInvitationsAction
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
            role: inv.role || "Aviation Professional",
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

      // 3. Dispatch via Next.js Server Action
      const actionRes = await sendCompanyInvitationAction({
        companyId,
        email: cleanEmail,
        role: inviteRole,
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
        role: inviteRole,
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
  const displayedInvitations =
    activeTab === "pending" ? pendingInvitations : invitations;

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

        <form onSubmit={handleSendInvitation} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">
              Professional's Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@aviation.com"
                required
                className="w-full h-11 px-3.5 pl-10 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">
              Role in Company
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:bg-white focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
            >
              <option value="Pilot">Pilot</option>
              <option value="Cabin Crew">Cabin Crew</option>
              <option value="Aviation Professional">
                Aviation Professional
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full h-12 mt-2 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending invitation...</span>
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

      {/* 2. Pending Invitations List Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base sm:text-lg text-gray-900">
            Pending Invitations
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Pending ({pendingInvitations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All ({invitations.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1d4ed8]" />
            <p className="text-xs text-gray-400">Loading invitations...</p>
          </div>
        ) : displayedInvitations.length === 0 ? (
          /* Empty State */
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1d4ed8] shadow-2xs mb-1">
              <Mail className="w-8 h-8 text-[#1d4ed8]" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {activeTab === "pending"
                  ? "No pending invitations"
                  : "No invitations sent"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                {activeTab === "pending"
                  ? "Active pending invitations will appear here."
                  : "New invitations will appear here."}
              </p>
            </div>
          </div>
        ) : (
          /* Populated List */
          <div className="space-y-3">
            {displayedInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {inv.email}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        inv.status === "accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.status === "declined"
                          ? "bg-red-100 text-red-800"
                          : inv.status === "revoked"
                          ? "bg-gray-200 text-gray-600"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  {/* Sent on date */}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Sent on{" "}
                    {new Date(inv.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {/* 1. Expiration Date: new line below 'Sent on' text */}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Expires{" "}
                    {inv.expires_at
                      ? new Date(inv.expires_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : new Date(
                          new Date(inv.created_at).getTime() +
                            7 * 24 * 60 * 60 * 1000
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                  </p>
                </div>

                {/* 2. UI Updates: Red 'Revoke' text button to the right side of each pending invitation card */}
                {inv.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleOpenRevokeModal(inv)}
                    className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer px-2 py-1 shrink-0"
                  >
                    Revoke
                  </button>
                )}
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
