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
  if (!rawRole) return "Operations Officer";
  const normalized = rawRole.toLowerCase().trim();
  const ROLE_MAP: Record<string, string> = {
    operations_officer: "Operations Officer",
    operations_specialist: "Operations Officer",
    aircraft_mechanic: "Aircraft Mechanic",
    air_traffic_controller: "Air Traffic Controller",
    aeronautical_engineer: "Aeronautical Engineer",
    aviation_professional: "Operations Officer",
    flight_crew: "Flight Crew",
    pilot: "Pilot",
    cabin_crew: "Cabin Crew",
  };
  if (ROLE_MAP[normalized]) return ROLE_MAP[normalized];
  if (normalized.includes("specialist") || normalized.includes("operations")) {
    return "Operations Officer";
  }
  return rawRole
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const formatSpanishDate = (dateStr?: string | null) => {
  if (!dateStr) return "recientemente";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "recientemente";
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "recientemente";
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

  // Feedback notification state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Confirmation Modal State (matching mobile app parity)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AffiliationRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

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

  // Real Supabase review execution triggered ONLY on modal confirmation
  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType || isConfirming) return;
    const requestId = selectedRequest.id || selectedRequest.affiliation_id;
    if (!requestId) return;

    setIsConfirming(true);
    setProcessingId(requestId);
    setFeedback(null);

    const decision = actionType === "approve" ? "approved" : "rejected";

    try {
      const result = await reviewCompanyAffiliationRequestAction({
        requestId,
        decision,
        rejectionReason: null,
      });

      if (!result.success) {
        throw new Error(result.error || `Failed to ${actionType} request.`);
      }

      const profName =
        selectedRequest.full_name ||
        [selectedRequest.first_name, selectedRequest.last_name].filter(Boolean).join(" ") ||
        selectedRequest.user?.name ||
        selectedRequest.username ||
        "The professional";

      setFeedback({
        type: "success",
        message:
          actionType === "approve"
            ? `Successfully approved affiliation request for ${profName}.`
            : `Affiliation request from ${profName} has been rejected.`,
      });

      setIsModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);

      // Refresh list
      await fetchRequests();
    } catch (err: any) {
      console.error(`Error processing ${actionType} request:`, err);
      setFeedback({
        type: "error",
        message: err?.message || `Failed to ${actionType} the request. Please try again.`,
      });
    } finally {
      setIsConfirming(false);
      setProcessingId(null);
    }
  };

  const handleCloseModal = () => {
    if (isConfirming) return;
    setIsModalOpen(false);
    setSelectedRequest(null);
    setActionType(null);
  };

  const modalUserName =
    selectedRequest?.full_name ||
    [
      selectedRequest?.user?.first_name || selectedRequest?.first_name,
      selectedRequest?.user?.last_name || selectedRequest?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    selectedRequest?.user?.name ||
    selectedRequest?.username ||
    "The professional";

  const modalCompanyName =
    selectedRequest?.company?.name ||
    selectedRequest?.company_name ||
    selectedRequest?.company_name_snapshot ||
    "your company";

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
            const targetUserId = item.user_id || item.user?.id || item.professional_id;

            const userObj = item.user || {};
            const firstName =
              userObj.first_name ||
              userObj.firstName ||
              item.first_name ||
              item.firstName ||
              "";
            const lastName =
              userObj.last_name ||
              userObj.lastName ||
              item.last_name ||
              item.lastName ||
              "";
            const fullName =
              [firstName, lastName].filter(Boolean).join(" ") ||
              item.full_name ||
              item.fullName ||
              userObj.name ||
              userObj.fullName ||
              userObj.username ||
              item.username ||
              "Aviation Professional";

            const role = formatRole(
              userObj.professionalTitleKey ||
              userObj.role ||
              userObj.professionalRole ||
              item.requested_role ||
              item.role ||
              item.user_role ||
              item.position ||
              item.professional_role
            );

            const avatar =
              userObj.profile_image ||
              userObj.profileImage ||
              item.profile_image ||
              item.profileImage ||
              item.avatar_url;

            const companyName =
              item.company?.name ||
              item.company_name ||
              item.company_name_snapshot ||
              "Company";

            const formattedDate = formatSpanishDate(item.created_at || item.requested_at);

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
                <Link
                  href={targetUserId ? `/profile/${targetUserId}` : "#"}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 w-fit"
                >
                  View profile
                </Link>

                {/* Botones de Acción (Fila inferior) */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(item);
                      setActionType("reject");
                      setIsModalOpen(true);
                    }}
                    disabled={isConfirming && processingId === requestId}
                    className="w-full py-3 px-6 rounded-full border border-red-500 text-red-600 font-semibold text-base hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(item);
                      setActionType("approve");
                      setIsModalOpen(true);
                    }}
                    disabled={isConfirming && processingId === requestId}
                    className="w-full py-3 px-6 rounded-full bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal (Mobile App Parity) */}
      {isModalOpen && selectedRequest && actionType && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isConfirming) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900">
              {actionType === "approve"
                ? "Approve affiliation?"
                : "Reject affiliation?"}
            </h3>

            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              {actionType === "approve"
                ? `${modalUserName} will appear as a Verified Employee of ${modalCompanyName}.`
                : `Are you sure you want to reject the affiliation request from ${modalUserName}?`}
            </p>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isConfirming}
                className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase cursor-pointer disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isConfirming}
                className={cn(
                  "text-sm font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
                  actionType === "approve"
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-red-600 hover:text-red-700"
                )}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>PROCESSING...</span>
                  </>
                ) : actionType === "approve" ? (
                  "APPROVE"
                ) : (
                  "REJECT"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
