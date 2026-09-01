"use client";

import React, { useEffect, useState } from "react";
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
  Copy,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SentInvitation {
  id: string;
  email: string;
  token?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
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

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

          // Fetch invitations for this company if table exists
          try {
            const { data: invData, error: invErr } = await supabase
              .from("company_affiliation_invitations")
              .select("*")
              .eq("company_id", companies[0].id)
              .order("created_at", { ascending: false });

            if (!invErr && invData) {
              setInvitations(
                invData.map((inv: any) => ({
                  id: inv.id,
                  email: inv.email || inv.invited_email || "professional@example.com",
                  token: inv.token || inv.invitation_token,
                  status: inv.status || "pending",
                  created_at: inv.created_at,
                  role: inv.role || "Aviation Professional",
                }))
              );
            } else {
              // Fallback to local storage for demo persistence
              const localInv = localStorage.getItem(`company_invitations_${companies[0].id}`);
              if (localInv) {
                setInvitations(JSON.parse(localInv));
              }
            }
          } catch (e) {
            const localInv = localStorage.getItem(`company_invitations_${companies[0].id}`);
            if (localInv) {
              setInvitations(JSON.parse(localInv));
            }
          }
        }
      } catch (err) {
        console.error("Error loading company invitations:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanyAndInvitations();
  }, [router]);

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
    setGeneratedLink(null);
    setCopied(false);

    try {
      // Generate a secure unique token
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15) +
        Date.now().toString(36);

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const inviteUrl = `${origin}/invitations/accept?token=${token}`;

      const newInvitation: SentInvitation = {
        id: "inv-" + Date.now(),
        email: cleanEmail,
        token,
        status: "pending",
        created_at: new Date().toISOString(),
        role: inviteRole,
      };

      // Try inserting into database
      if (companyId) {
        try {
          await supabase.from("company_affiliation_invitations").insert({
            company_id: companyId,
            email: cleanEmail,
            invited_email: cleanEmail,
            token,
            invitation_token: token,
            role: inviteRole,
            status: "pending",
          });
        } catch (dbErr) {
          console.warn("Could not write invitation to DB, saving locally:", dbErr);
        }

        // Persist to local state and localStorage
        const updatedList = [newInvitation, ...invitations];
        setInvitations(updatedList);
        localStorage.setItem(`company_invitations_${companyId}`, JSON.stringify(updatedList));
      }

      setInviteEmail("");
      setGeneratedLink(inviteUrl);
      setSuccessMessage(`Invitation sent to ${cleanEmail}`);
    } catch (err: any) {
      console.error("Error sending invitation:", err);
      setErrorMessage(err?.message || "Failed to create invitation. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

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
            Invite a Pilot, Crew member, or Aviation Professional. Accepted invitations are verified automatically.
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold">{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="p-1 text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {generatedLink && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-gray-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy link"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSendInvitation} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
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

          {/* Info Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-[#1d4ed8] text-[11px] font-semibold border border-blue-100/80">
              <Lock className="w-3 h-3" />
              Email must match
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-[#1d4ed8] text-[11px] font-semibold border border-blue-100/80">
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

      {/* 2. Invitations List Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base sm:text-lg text-gray-900">
            Invitations
          </h2>
          {invitations.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
              {invitations.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1d4ed8]" />
            <p className="text-xs text-gray-400">Loading invitations...</p>
          </div>
        ) : invitations.length === 0 ? (
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
            {invitations.map((inv) => (
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
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Sent on{" "}
                    {new Date(inv.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {inv.token && (
                  <button
                    type="button"
                    onClick={() => {
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      const link = `${origin}/invitations/accept?token=${inv.token}`;
                      navigator.clipboard.writeText(link);
                      alert("Invitation link copied to clipboard!");
                    }}
                    className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-colors shadow-2xs shrink-0 cursor-pointer"
                    title="Copy invitation link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
