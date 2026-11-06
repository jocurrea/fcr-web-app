"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, RotateCcw, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import {
  fetchFrequencyMembers,
  FrequencyMember,
  listFrequencyInvitations,
  issueFrequencyInvitation,
  AdminInvitationItem,
} from "@/lib/api/frequencies";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function FrequencyMembersPage() {
  const router = useRouter();
  const params = useParams();
  const frequencyId = params?.id as string;

  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const [isAdmin, setIsAdmin] = useState(false);

  const [members, setMembers] = useState<FrequencyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [invitations, setInvitations] = useState<AdminInvitationItem[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [resendingRecipientId, setResendingRecipientId] = useState<string | null>(null);

  // Cooldown tracker: recipientId -> timestamp (ms) when cooldown ends
  const [cooldownMap, setCooldownMap] = useState<Record<string, number>>({});
  const [, setTimerTick] = useState(0);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Check user admin status and load members
  useEffect(() => {
    if (!frequencyId) return;

    async function initPage() {
      setLoadingMembers(true);

      // Check current user role
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      if (currentUserId) {
        // Check groupMembers role
        const { data: memberRow } = await supabase
          .from("groupMembers")
          .select("role")
          .eq("groupId", frequencyId)
          .eq("userId", currentUserId)
          .maybeSingle();

        // Check group owner
        const { data: groupRow } = await supabase
          .from("groups")
          .select("userId")
          .eq("id", frequencyId)
          .maybeSingle();

        const userIsAdmin =
          memberRow?.role === "admin" ||
          groupRow?.userId === currentUserId;

        setIsAdmin(!!userIsAdmin);
      }

      // Load joined members
      const membersData = await fetchFrequencyMembers(frequencyId);
      setMembers(membersData);
      setLoadingMembers(false);
    }

    initPage();
  }, [frequencyId]);

  // 2. Load invitations if admin and tab is active
  const loadInvitations = async () => {
    if (!frequencyId || !isAdmin) return;
    setLoadingInvitations(true);
    const { invitations: invs, error } = await listFrequencyInvitations(frequencyId, 50);
    if (error) {
      console.error("Failed to load frequency invitations:", error);
    } else {
      setInvitations(invs);
    }
    setLoadingInvitations(false);
  };

  useEffect(() => {
    if (activeTab === "invitations" && isAdmin) {
      loadInvitations();
    }
  }, [activeTab, isAdmin, frequencyId]);

  // 3. Cooldown timer ticker (re-evaluates cooldowns every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRemainingCooldown = (recipientId: string): number => {
    const expireAt = cooldownMap[recipientId];
    if (!expireAt) return 0;
    const diff = Math.ceil((expireAt - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  };

  // 4. Handle resend invitation
  const handleResend = async (invitation: AdminInvitationItem) => {
    const remaining = getRemainingCooldown(invitation.recipient_id);
    if (remaining > 0) {
      showToast(`Please wait ${remaining}s before resending to this member.`, "error");
      return;
    }

    setResendingRecipientId(invitation.recipient_id);

    const res = await issueFrequencyInvitation(
      frequencyId,
      invitation.recipient_id,
      invitation.id
    );

    setResendingRecipientId(null);

    if (res.success) {
      showToast("Invitation resent successfully!", "success");
      // Set 60-second cooldown for this recipient
      setCooldownMap((prev) => ({
        ...prev,
        [invitation.recipient_id]: Date.now() + 60 * 1000,
      }));
      // Refresh list
      loadInvitations();
    } else {
      showToast(res.error || "Failed to resend invitation", "error");
      // If error indicates stale state, refresh list
      if (res.errorCode === "22023" || res.errorCode === "55000") {
        loadInvitations();
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-white min-h-screen">
      {/* Header */}
      <header className="flex items-center py-5 px-4 relative mt-2">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </button>
        <h1 className="flex-1 text-center text-[20px] font-medium text-[#0f172a] pr-10">
          Frequency Members
        </h1>
      </header>

      {/* Tabs navigation (Admins see both Members & Invitations) */}
      {isAdmin && (
        <div className="flex border-b border-gray-100 px-6 mb-3">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 text-center ${
              activeTab === "members"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 text-center ${
              activeTab === "invitations"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Invitations ({invitations.length})
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex flex-col px-6 gap-4 mt-2 flex-1 pb-10">
        {activeTab === "members" ? (
          /* Members Tab */
          loadingMembers ? (
            <div className="text-center py-12 text-gray-400">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No members in this frequency yet.</div>
          ) : (
            members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded-xl transition-colors"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm bg-gray-100"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-medium text-gray-900 leading-tight truncate">
                      {member.name}
                    </span>
                    {member.groupRole === "admin" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                  </div>
                  <span className="text-[14px] text-gray-500 truncate">{member.role}</span>
                </div>
              </Link>
            ))
          )
        ) : (
          /* Invitations Tab (Admin only) */
          loadingInvitations ? (
            <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No pending or declined invitations for this frequency.
            </div>
          ) : (
            invitations.map((inv) => {
              const cooldownLeft = getRemainingCooldown(inv.recipient_id);
              const isResending = resendingRecipientId === inv.recipient_id;

              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3.5 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all bg-white"
                >
                  <img
                    src={inv.recipient?.avatar}
                    alt={inv.recipient?.name || "Recipient"}
                    className="w-11 h-11 rounded-full object-cover border border-gray-200 bg-gray-100 shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[15px] font-medium text-gray-900 leading-tight truncate">
                      {inv.recipient?.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {inv.status === "declined" ? (
                        <span className="text-xs font-semibold text-red-600">
                          Declined
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500">
                          Pending
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">•</span>
                      <span className="text-xs text-gray-400 truncate">
                        {inv.recipient?.role || "Invited"}
                      </span>
                    </div>
                  </div>

                  {/* Resend button */}
                  <button
                    type="button"
                    onClick={() => handleResend(inv)}
                    disabled={isResending || cooldownLeft > 0}
                    className="px-3.5 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
                    <span>
                      {isResending
                        ? "Sending..."
                        : cooldownLeft > 0
                        ? `Wait ${cooldownLeft}s`
                        : "Resend"}
                    </span>
                  </button>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div
            className={`px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
              toastMessage.type === "success"
                ? "bg-gray-900 text-white border-gray-800"
                : "bg-red-600 text-white border-red-500"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
            )}
            <span className="text-sm font-semibold whitespace-nowrap">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
