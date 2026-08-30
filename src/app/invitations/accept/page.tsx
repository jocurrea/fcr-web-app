"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogIn,
  UserPlus,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface InvitationData {
  company_id?: string;
  company_name?: string;
  company_logo?: string | null;
  company_location?: string | null;
  role?: string | null;
  position?: string | null;
  email?: string | null;
  invited_email?: string | null;
  status?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  inviter_name?: string | null;
  message?: string | null;
  [key: string]: any;
}

type ActionState =
  | "idle"
  | "accepted"
  | "declined"
  | "already_accepted"
  | "already_declined"
  | "expired"
  | "cancelled";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isResolving, setIsResolving] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<"accept" | "decline" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");

  // 1. Session Check
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSessionUser(session?.user || null);
      } catch (err) {
        console.error("Error checking session:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Token Resolution via RPC
  useEffect(() => {
    if (!token) {
      setIsResolving(false);
      setResolveError("No invitation token provided in the URL.");
      return;
    }

    async function resolveInvitation() {
      setIsResolving(true);
      setResolveError(null);

      try {
        // Primary RPC call
        let res = await supabase.rpc("resolve_company_affiliation_invitation", {
          token: token,
        });

        if (res.error) {
          // Fallback parameter signatures
          const res2 = await supabase.rpc("resolve_company_affiliation_invitation", {
            invitation_token: token,
          });
          if (!res2.error && res2.data) {
            res = res2;
          } else {
            const res3 = await supabase.rpc("resolve_company_affiliation_invitation", {
              p_token: token,
            });
            if (!res3.error && res3.data) {
              res = res3;
            }
          }
        }

        if (res.error) {
          console.error("Error resolving invitation:", res.error);
          setResolveError(
            res.error.message || "Invalid, expired, or previously processed invitation."
          );
          return;
        }

        const data: InvitationData =
          (Array.isArray(res.data) ? res.data[0] : res.data) || {};
        setInvitation(data);

        // Check if invitation already has a final status
        const status = (data.status || "").toLowerCase();
        if (status === "accepted") {
          setActionState("already_accepted");
        } else if (status === "declined") {
          setActionState("already_declined");
        } else if (
          status === "expired" ||
          (data.expires_at && new Date(data.expires_at) < new Date())
        ) {
          setActionState("expired");
        } else if (status === "cancelled") {
          setActionState("cancelled");
        }
      } catch (err: any) {
        console.error("Exception resolving invitation:", err);
        setResolveError(
          err?.message || "Failed to validate invitation. Please try again."
        );
      } finally {
        setIsResolving(false);
      }
    }

    resolveInvitation();
  }, [token]);

  // 3. Action Handlers: Accept
  const handleAccept = async () => {
    if (!token || isProcessing) return;

    setIsProcessing(true);
    setProcessingAction("accept");
    setActionError(null);

    try {
      let res = await supabase.rpc("accept_company_affiliation_invitation", {
        token: token,
      });

      if (res.error) {
        const res2 = await supabase.rpc("accept_company_affiliation_invitation", {
          invitation_token: token,
        });
        if (!res2.error) {
          res = res2;
        } else {
          const res3 = await supabase.rpc("accept_company_affiliation_invitation", {
            p_token: token,
          });
          if (!res3.error) {
            res = res3;
          }
        }
      }

      if (res.error) {
        throw res.error;
      }

      setActionState("accepted");
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      setActionError(
        err?.message || "Failed to accept the invitation. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  // 4. Action Handlers: Decline
  const handleDecline = async () => {
    if (!token || isProcessing) return;

    setIsProcessing(true);
    setProcessingAction("decline");
    setActionError(null);

    try {
      let res = await supabase.rpc("decline_company_affiliation_invitation", {
        token: token,
      });

      if (res.error) {
        const res2 = await supabase.rpc("decline_company_affiliation_invitation", {
          invitation_token: token,
        });
        if (!res2.error) {
          res = res2;
        } else {
          const res3 = await supabase.rpc("decline_company_affiliation_invitation", {
            p_token: token,
          });
          if (!res3.error) {
            res = res3;
          }
        }
      }

      if (res.error) {
        throw res.error;
      }

      setActionState("declined");
    } catch (err: any) {
      console.error("Error declining invitation:", err);
      setActionError(
        err?.message || "Failed to decline the invitation. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const companyName =
    invitation?.company_name ||
    invitation?.company?.name ||
    "Aviation Enterprise";
  const companyLogo =
    invitation?.company_logo ||
    invitation?.company?.logo_url ||
    invitation?.logo_url ||
    null;
  const companyLocation =
    invitation?.company_location ||
    invitation?.company?.location ||
    null;
  const roleName = invitation?.role || invitation?.position || "Aviation Professional";
  const targetEmail = invitation?.email || invitation?.invited_email || null;

  const currentRedirectUrl = `/invitations/accept?token=${encodeURIComponent(token)}`;

  // ==========================================
  // RENDER: Loading State
  // ==========================================
  if (isResolving || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-sm text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">Validating Invitation</h2>
            <p className="text-sm text-gray-500">
              Please wait while we verify your company invitation token...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Token Error / Invalid State
  // ==========================================
  if (resolveError || !invitation) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
        {/* Top Logo */}
        <div className="mb-8">
          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[200px] h-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-sm text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-gray-900">
              Invitation Not Found
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {resolveError ||
                "The invitation link is invalid, has expired, or has already been processed."}
            </p>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2.5">
            <Link
              href="/home"
              className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              <span>Log in with an account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Success - Accepted State
  // ==========================================
  if (actionState === "accepted" || actionState === "already_accepted") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[200px] h-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-sm text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Affiliation Confirmed</span>
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              Welcome to {companyName}!
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              {actionState === "already_accepted"
                ? "This invitation has already been accepted. Your affiliation is active."
                : `You are now successfully affiliated with ${companyName} as ${roleName}.`}
            </p>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2.5">
            <Link
              href="/profile"
              className="w-full py-4 px-6 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View My Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/home"
              className="w-full py-3.5 px-6 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              <span>Go to Feed</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Declined State
  // ==========================================
  if (actionState === "declined" || actionState === "already_declined") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[200px] h-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-sm text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-gray-900">
              Invitation Declined
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You have declined the affiliation invitation from{" "}
              <strong>{companyName}</strong>. No changes were made to your profile.
            </p>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2.5">
            <Link
              href="/home"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Expired / Cancelled State
  // ==========================================
  if (actionState === "expired" || actionState === "cancelled") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[200px] h-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-sm text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-gray-900">
              {actionState === "expired"
                ? "Invitation Expired"
                : "Invitation Cancelled"}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {actionState === "expired"
                ? `This invitation from ${companyName} has expired. Please request a new invitation from the company administrator.`
                : `This invitation was cancelled by ${companyName}.`}
            </p>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2.5">
            <Link
              href="/home"
              className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Unauthenticated State (Prompt to Login / Register)
  // ==========================================
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <img
            src="/img/FCRlogo2.png"
            alt="Flight Crew Ranked"
            className="w-[200px] h-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-sm flex flex-col items-center text-center gap-6">
          {/* Company Logo / Building Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-50 border border-blue-100 flex items-center justify-center shadow-xs">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-10 h-10 text-blue-600" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </div>

          {/* Invitation Text */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              <span>Company Affiliation Invitation</span>
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              Join {companyName}
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              You have been invited to join <strong>{companyName}</strong> as{" "}
              <span className="font-semibold text-gray-900">{roleName}</span> on
              Flight Crew Ranked.
            </p>

            {targetEmail && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-500 text-xs font-medium border border-gray-100">
                <Mail className="w-3.5 h-3.5" />
                <span>Sent to: {targetEmail}</span>
              </div>
            )}
          </div>

          {/* Auth CTA Banner */}
          <div className="w-full p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Please log in or create your account to accept this invitation and
                link your profile.
              </p>
            </div>
          </div>

          {/* Login / Register Buttons */}
          <div className="w-full flex flex-col gap-3">
            <Link
              href={`/login?redirect=${encodeURIComponent(currentRedirectUrl)}`}
              className="w-full py-4 px-6 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Accept</span>
            </Link>

            <Link
              href={`/role-selection?redirect=${encodeURIComponent(currentRedirectUrl)}`}
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold transition-colors border border-gray-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <UserPlus className="w-4 h-4 text-gray-500" />
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Authenticated State (Ready to Accept / Decline)
  // ==========================================
  const isEmailMismatch =
    targetEmail &&
    sessionUser.email &&
    targetEmail.toLowerCase() !== sessionUser.email.toLowerCase();

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-4 py-12">
      {/* Top Logo */}
      <div className="mb-8">
        <img
          src="/img/FCRlogo2.png"
          alt="Flight Crew Ranked"
          className="w-[200px] h-auto object-contain"
        />
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-100 shadow-sm flex flex-col items-center text-center gap-6">
        {/* Company Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-50 border border-blue-100 flex items-center justify-center shadow-xs">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white">
            <Briefcase className="w-3 h-3" />
          </span>
        </div>

        {/* Company & Role Details */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
            <span>Affiliation Request</span>
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
            {companyName}
          </h1>
          {companyLocation && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>{companyLocation}</span>
            </div>
          )}
        </div>

        {/* Invitation Summary Box */}
        <div className="w-full bg-gray-50/80 rounded-2xl p-4 border border-gray-100/90 text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Invited Position:</span>
            <span className="text-gray-900 font-bold">{roleName}</span>
          </div>

          {sessionUser?.email && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
              <span className="text-gray-500 font-medium">Accepting as:</span>
              <span className="text-gray-900 font-semibold truncate max-w-[200px]">
                {sessionUser.email}
              </span>
            </div>
          )}
        </div>

        {/* Email Mismatch Warning (if any) */}
        {isEmailMismatch && (
          <div className="w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70 text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Note: This invitation was originally sent to <strong>{targetEmail}</strong>,
              and you are currently logged in as <strong>{sessionUser.email}</strong>.
            </p>
          </div>
        )}

        {/* Action Error Alert (if any) */}
        {actionError && (
          <div className="w-full p-3.5 rounded-2xl bg-red-50 border border-red-200/70 text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 leading-relaxed font-medium">
              {actionError}
            </p>
          </div>
        )}

        {/* Action Buttons: Accept & Decline */}
        <div className="w-full flex flex-col gap-3 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            className={cn(
              "w-full py-4 px-6 rounded-2xl font-bold text-white text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer",
              isProcessing && processingAction === "accept"
                ? "bg-[#1d4ed8]/80 cursor-wait"
                : isProcessing
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-[0.99]"
            )}
          >
            {isProcessing && processingAction === "accept" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Accepting Affiliation...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Accept Affiliation</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDecline}
            disabled={isProcessing}
            className={cn(
              "w-full py-3 px-6 rounded-2xl font-semibold text-gray-600 hover:text-red-600 text-sm transition-colors hover:bg-red-50/60 border border-gray-200 flex items-center justify-center gap-2 cursor-pointer",
              isProcessing && processingAction === "decline"
                ? "bg-red-50 text-red-600 cursor-wait"
                : isProcessing
                ? "opacity-50 cursor-not-allowed"
                : ""
            )}
          >
            {isProcessing && processingAction === "decline" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Declining...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Decline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
