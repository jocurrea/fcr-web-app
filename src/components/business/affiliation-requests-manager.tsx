"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Clock,
  User,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import {
  getPendingCompanyAffiliationRequestsAction,
  reviewCompanyAffiliationRequestAction,
} from "@/actions/affiliations";

export interface AffiliationRequest {
  id: string;
  user_id?: string;
  professional_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  requested_role?: string | null;
  role?: string | null;
  position?: string | null;
  profile_image?: string | null;
  profileImage?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  requested_at?: string | null;
  email?: string | null;
  location?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  [key: string]: any;
}

interface AffiliationRequestsManagerProps {
  className?: string;
  onCountChange?: (count: number) => void;
  hideHeader?: boolean;
}

const formatRole = (rawRole?: string | null) => {
  if (!rawRole) return "Operations Specialist";
  const ROLE_MAP: Record<string, string> = {
    operations_officer: "Operations Officer",
    aircraft_mechanic: "Aircraft Mechanic",
    air_traffic_controller: "Air Traffic Controller",
    aeronautical_engineer: "Aeronautical Engineer",
    aviation_professional: "Aviation Professional",
    flight_crew: "Flight Crew",
    pilot: "Pilot",
    cabin_crew: "Cabin Crew",
  };
  if (ROLE_MAP[rawRole]) return ROLE_MAP[rawRole];
  return rawRole
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const formatRequestDate = (dateStr?: string | null) => {
  if (!dateStr) return "Recently";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 3600) return "Recently";
    const diffInHours = Math.floor(diffInSeconds / 3600);
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
};

export function AffiliationRequestsManager({
  className = "",
  onCountChange,
  hideHeader = false,
}: AffiliationRequestsManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  const [requests, setRequests] = useState<AffiliationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Processing state per item
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"approved" | "rejected" | null>(null);

  // Feedback notification state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Rejection Modal State
  const [rejectingItem, setRejectingItem] = useState<AffiliationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Fetch pending requests via Server Action to bypass RLS and buggy RPCs
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { getPendingCompanyAffiliationRequestsAction } = await import("@/actions/affiliations");
      const res = await getPendingCompanyAffiliationRequestsAction();

      console.log("Action Data:", res.data, "Action Error:", res.error);

      if (!res.success) {
        setError(res.error || "Failed to load pending requests.");
        setRequests([]);
        if (onCountChange) onCountChange(0);
        return;
      }

      const requestsData = Array.isArray(res.data) ? res.data : [];
      setRequests(requestsData as AffiliationRequest[]);
      if (onCountChange) onCountChange(requestsData.length);
    } catch (err: any) {
      console.error("[AffiliationRequests] Exception:", err);
      setError(err?.message || "Failed to load pending requests. Please try again.");
      setRequests([]);
      if (onCountChange) onCountChange(0);
    } finally {
      setIsLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle Approve
  const handleApprove = async (request: AffiliationRequest) => {
    const requestId = request.id || request.affiliation_id;
    if (!requestId || processingId) return;

    setProcessingId(requestId);
    setProcessingAction("approved");
    setFeedback(null);

    try {
      const result = await reviewCompanyAffiliationRequestAction({
        requestId,
        decision: "approved",
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to approve request.");
      }

      const profName =
        request.full_name ||
        [request.first_name, request.last_name].filter(Boolean).join(" ") ||
        request.username ||
        "The professional";

      setFeedback({
        type: "success",
        message: result.message || `Successfully approved affiliation request for ${profName}.`,
      });

      // Refresh list
      await fetchRequests();
    } catch (err: any) {
      console.error("Error approving affiliation request:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to approve the request. Please try again.",
      });
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  // Open Rejection Modal
  const openRejectModal = (request: AffiliationRequest) => {
    setRejectingItem(request);
    setRejectReason("");
    setRejectError(null);
  };

  // Submit Rejection
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem || processingId) return;

    const requestId = rejectingItem.id || rejectingItem.affiliation_id;
    if (!requestId) return;

    setProcessingId(requestId);
    setProcessingAction("rejected");
    setRejectError(null);

    try {
      const result = await reviewCompanyAffiliationRequestAction({
        requestId,
        decision: "rejected",
        rejectionReason: rejectReason.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to decline request.");
      }

      const profName =
        rejectingItem.full_name ||
        [rejectingItem.first_name, rejectingItem.last_name].filter(Boolean).join(" ") ||
        rejectingItem.username ||
        "The professional";

      setFeedback({
        type: "success",
        message: result.message || `Affiliation request from ${profName} has been declined.`,
      });

      setRejectingItem(null);
      setRejectReason("");

      // Refresh list
      await fetchRequests();
    } catch (err: any) {
      console.error("Error rejecting affiliation request:", err);
      setRejectError(err?.message || "Failed to decline the request. Please try again.");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header Bar with Count and Refresh */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">
                Affiliation Requests
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Review professionals requesting to link their profile with your business.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {requests.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                {requests.length} Pending
              </span>
            )}

            <button
              type="button"
              onClick={() => fetchRequests()}
              disabled={isLoading}
              className="w-9 h-9 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-blue-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh requests"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-blue-600")} />
            </button>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            "p-4 rounded-2xl border flex items-start justify-between gap-3 transition-all",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <p className="text-xs sm:text-sm font-medium leading-relaxed">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-black/5"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Failed to load requests</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchRequests()}
            className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && requests.length === 0 && (
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs sm:text-sm font-medium text-gray-500">
            Loading pending affiliation requests...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && requests.length === 0 && (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1d4ed8] shadow-2xs mb-1">
            <UserCheck className="w-8 h-8 text-[#1d4ed8]" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              No pending requests
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              New professional affiliation requests will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Requests List */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((item) => {
            const requestId = item.id || item.affiliation_id;
            const userId = item.user_id || item.professional_id;
            const fullName =
              item.full_name ||
              [item.first_name, item.last_name].filter(Boolean).join(" ") ||
              item.username ||
              "Aviation Professional";
            const role = formatRole(
              item.requested_role ||
              item.role ||
              item.user_role ||
              item.position ||
              item.professional_role
            );
            const avatar = item.profile_image || item.profileImage || item.avatar_url;
            const companyName = item.company_name || item.company_name_snapshot || "Company";
            const formattedDate = formatRequestDate(item.created_at || item.requested_at);

            const isThisItemProcessing = processingId === requestId;

            return (
              <div
                key={requestId}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
              >
                {/* Cabecera del Usuario (Fila superior) */}
                <div className="flex items-center gap-4">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={fullName}
                      className="w-14 h-14 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#1d4ed8] text-white font-bold flex items-center justify-center text-xl shrink-0">
                      {fullName[0]?.toUpperCase() || "A"}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 truncate">
                      {fullName}
                    </h4>
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {role}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {companyName} · Requested {formattedDate}
                    </p>
                  </div>
                </div>

                {/* Enlace de Perfil */}
                <button
                  type="button"
                  onClick={() => {
                    if (userId) {
                      router.push(`/profile/${userId}`);
                    }
                  }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 w-fit cursor-pointer"
                >
                  View profile
                </button>

                {/* Botones de Acción (Fila inferior) */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => openRejectModal(item)}
                    disabled={isThisItemProcessing}
                    className="w-full py-3 px-6 rounded-full border border-red-500 text-red-600 font-semibold text-base hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    {isThisItemProcessing && processingAction === "rejected" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Reject"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    disabled={isThisItemProcessing}
                    className="w-full py-3 px-6 rounded-full bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isThisItemProcessing && processingAction === "approved" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Approve"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-gray-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Reject Affiliation Request
                  </h3>
                  <p className="text-xs text-gray-500">
                    {rejectingItem.full_name ||
                      [rejectingItem.first_name, rejectingItem.last_name].filter(Boolean).join(" ") ||
                      rejectingItem.username ||
                      "The professional"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="reject-reason"
                  className="text-xs font-bold text-gray-700 block"
                >
                  Reason for rejection (Optional)
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Unverified credentials, position not currently matching company records..."
                  className="w-full p-3 rounded-2xl text-xs sm:text-sm bg-gray-50/70 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200/40 transition-all resize-none placeholder:text-gray-400 outline-none"
                  maxLength={300}
                />
                <span className="text-[11px] text-gray-400 block text-right">
                  {rejectReason.length} / 300
                </span>
              </div>

              {rejectError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{rejectError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  disabled={processingId !== null}
                  className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId !== null}
                  className="py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {processingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Confirm Reject</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
