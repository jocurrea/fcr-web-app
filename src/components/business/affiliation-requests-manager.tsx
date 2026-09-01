"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
}

export function AffiliationRequestsManager({
  className = "",
  onCountChange,
}: AffiliationRequestsManagerProps) {
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

  // Fetch pending requests via get_pending_company_affiliation_requests RPC
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let res = await supabase.rpc("get_pending_company_affiliation_requests");

      if (res.error) {
        console.error("Error fetching pending affiliation requests:", res.error);
        setError(res.error.message || "Failed to load pending requests.");
        setRequests([]);
        if (onCountChange) onCountChange(0);
        return;
      }

      const data: AffiliationRequest[] = Array.isArray(res.data) ? res.data : [];
      setRequests(data);
      if (onCountChange) onCountChange(data.length);
    } catch (err: any) {
      console.error("Exception fetching pending affiliation requests:", err);
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
      let res = await supabase.rpc("review_company_affiliation_request", {
        affiliation_id: requestId,
        status: "approved",
        reason: null,
      });

      if (res.error) {
        // Fallback parameter signatures
        const res2 = await supabase.rpc("review_company_affiliation_request", {
          p_affiliation_id: requestId,
          p_status: "approved",
          p_reason: null,
        });
        if (!res2.error) {
          res = res2;
        } else {
          const res3 = await supabase.rpc("review_company_affiliation_request", {
            id: requestId,
            status: "approved",
          });
          if (!res3.error) {
            res = res3;
          }
        }
      }

      if (res.error) {
        throw res.error;
      }

      const profName =
        request.full_name ||
        [request.first_name, request.last_name].filter(Boolean).join(" ") ||
        request.username ||
        "The professional";

      setFeedback({
        type: "success",
        message: `Successfully approved affiliation request for ${profName}.`,
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
      let res = await supabase.rpc("review_company_affiliation_request", {
        affiliation_id: requestId,
        status: "rejected",
        reason: rejectReason.trim() || null,
      });

      if (res.error) {
        // Fallback parameter signatures
        const res2 = await supabase.rpc("review_company_affiliation_request", {
          p_affiliation_id: requestId,
          p_status: "rejected",
          p_reason: rejectReason.trim() || null,
        });
        if (!res2.error) {
          res = res2;
        } else {
          const res3 = await supabase.rpc("review_company_affiliation_request", {
            id: requestId,
            status: "rejected",
            reason: rejectReason.trim() || null,
          });
          if (!res3.error) {
            res = res3;
          }
        }
      }

      if (res.error) {
        throw res.error;
      }

      const profName =
        rejectingItem.full_name ||
        [rejectingItem.first_name, rejectingItem.last_name].filter(Boolean).join(" ") ||
        rejectingItem.username ||
        "The professional";

      setFeedback({
        type: "success",
        message: `Affiliation request from ${profName} has been declined.`,
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
            <Building2 className="w-8 h-8 text-[#1d4ed8]" />
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
        <div className="space-y-3">
          {requests.map((item) => {
            const requestId = item.id || item.affiliation_id;
            const userId = item.user_id || item.professional_id;
            const fullName =
              item.full_name ||
              [item.first_name, item.last_name].filter(Boolean).join(" ") ||
              item.username ||
              "Aviation Professional";
            const role =
              item.requested_role ||
              item.role ||
              item.position ||
              item.professional_role ||
              "Operations Specialist";
            const avatar = item.profile_image || item.profileImage || item.avatar_url;
            const requestDate = item.created_at || item.requested_at;
            const formattedDate = requestDate
              ? new Date(requestDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recently";

            const isThisItemProcessing = processingId === requestId;

            return (
              <div
                key={requestId}
                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Left Side: Avatar + Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center shadow-2xs">
                    {avatar ? (
                      <img src={avatar} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#1d4ed8] text-white font-extrabold flex items-center justify-center text-lg sm:text-xl">
                        {fullName[0]?.toUpperCase() || "A"}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                        {fullName}
                      </h4>
                      {userId && (
                        <Link
                          href={`/profile/${userId}`}
                          target="_blank"
                          className="text-gray-400 hover:text-blue-600 transition-colors p-0.5"
                          title="View public profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eff6ff] text-[#1d4ed8]">
                        {role}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>Requested {formattedDate}</span>
                      </span>
                    </div>

                    {item.email && (
                      <span className="text-xs text-gray-500 truncate mt-1">
                        {item.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    disabled={isThisItemProcessing}
                    className={cn(
                      "flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer",
                      isThisItemProcessing && processingAction === "approved"
                        ? "bg-emerald-600/80 cursor-wait"
                        : isThisItemProcessing
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
                    )}
                  >
                    {isThisItemProcessing && processingAction === "approved" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Approve</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openRejectModal(item)}
                    disabled={isThisItemProcessing}
                    className={cn(
                      "flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-gray-700 hover:text-red-700 bg-gray-50 hover:bg-red-50/80 border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                      isThisItemProcessing && processingAction === "rejected"
                        ? "bg-red-50 text-red-600 cursor-wait"
                        : isThisItemProcessing
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    )}
                  >
                    {isThisItemProcessing && processingAction === "rejected" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Declining...</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </>
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
                    Decline Affiliation Request
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
                  Reason for declining (Optional)
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
                      <span>Declining...</span>
                    </>
                  ) : (
                    <span>Confirm Decline</span>
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
