"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Mail,
  Phone,
  FileText,
  Calendar,
  Globe,
  Pencil,
  ChevronLeft,
  Building2,
  MessageSquare,
  Send,
  X,
  ShieldCheck,
  Clock,
  Ban,
  Lock,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  getExistingDirectConversation,
  initiateMessageRequest,
  checkSenderContactStatus,
  ContactStatus,
} from "@/lib/api/chat";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  operations_officer: "Operations Officer",
  aircraft_mechanic: "Aircraft Mechanic",
  air_traffic_controller: "Air Traffic Controller",
  aeronautical_engineer: "Aeronautical Engineer",
  other_aviation_professional: "Aviation Professional",
  aviation_professional: "Aviation Professional",
  pilot: "Pilot",
  crew: "Cabin Crew",
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  // E01-HU11: Company affiliation state from get_public_profile RPC
  const [affiliationInfo, setAffiliationInfo] = useState<{
    name: string;
    id: string | null;
    status: string;
    logo?: string | null;
  } | null>(null);

  // HU-01 & HU-02: Message Request state, cooldown & anti-spam restrictions
  const [contactStatus, setContactStatus] = useState<ContactStatus | null>(null);
  const [restrictionModal, setRestrictionModal] = useState<{ title: string; message: string } | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageRequestText, setMessageRequestText] = useState("");
  const [isCheckingConversation, setIsCheckingConversation] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleMessageClick = async () => {
    if (!profileId || isOwnProfile) return;
    setIsCheckingConversation(true);
    try {
      const status = await checkSenderContactStatus(profileId);
      setContactStatus(status);

      if (status.reason === "cooldown") {
        setRestrictionModal({
          title: "72-Hour Cooldown Active",
          message: `Your previous message request was declined. In accordance with community anti-spam guidelines, a 72-hour cooldown is in effect before you can submit a 2nd (and final) request. Cooldown expires in ${status.remainingHours}h ${status.remainingMinutes}m.`,
        });
        return;
      }

      if (status.reason === "permanently_declined") {
        setRestrictionModal({
          title: "Message Requests Restricted",
          message: "You have reached the maximum allowed requests for this user (2 requests declined). In accordance with community safety guidelines, you are permanently restricted from contacting this user.",
        });
        return;
      }

      if (status.reason === "blocked") {
        setRestrictionModal({
          title: "Contact Restricted",
          message: "You cannot initiate contact with this user.",
        });
        return;
      }

      if (status.reason === "blocked_by_me") {
        setRestrictionModal({
          title: "Contact Blocked",
          message: "You have blocked this contact. To message them, you must unblock them first from Settings > Blocked Users.",
        });
        return;
      }

      if (status.reason === "business_dms_disabled") {
        setRestrictionModal({
          title: "Direct Messages Disabled",
          message: `${status.businessName || "This business account"} does not accept direct messages at this time.`,
        });
        return;
      }

      const existing = await getExistingDirectConversation(profileId);
      if (existing?.conversationId && existing.requestStatus === "accepted") {
        router.push(`/messages/${existing.conversationId}`);
        return;
      }

      setIsMessageModalOpen(true);
    } catch (err) {
      console.error("Error checking direct conversation:", err);
      setIsMessageModalOpen(true);
    } finally {
      setIsCheckingConversation(false);
    }
  };

  const handleSendInitialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageRequestText.trim() || isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    setRequestError(null);
    try {
      const res = await initiateMessageRequest(profileId, messageRequestText.trim());
      if (res.success && res.conversationId) {
        setIsMessageModalOpen(false);
        setMessageRequestText("");
        router.push(`/messages/${res.conversationId}`);
      } else {
        setRequestError(res.error || "Failed to send message request.");
      }
    } catch (err: any) {
      setRequestError(err?.message || "Failed to send message request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsOwnProfile(session?.user?.id === profileId);

        const [userRes, resumeRes, userProfileRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", profileId).maybeSingle(),
          supabase.from("resumes").select("data").eq("userId", profileId).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("user_id", profileId).maybeSingle(),
        ]);

        const dbUser = userRes.data;
        const dbResume = resumeRes.data?.data;
        const dbUserProfile = userProfileRes.data;

        setProfileData({
          user: dbUser,
          userProfile: dbUserProfile,
          personal: dbResume?.personal || {},
          work: dbResume?.work || dbResume?.personal?.workExperience || [],
        });

        // E01-HU11: Read company affiliation using get_public_profile RPC
        try {
          let publicProfileRpc: any = null;
          const { data: d1, error: e1 } = await supabase.rpc("get_public_profile", {
            user_id: profileId,
          });
          if (!e1 && d1) {
            publicProfileRpc = d1;
          } else {
            const { data: d2 } = await supabase.rpc("get_public_profile", {
              profile_id: profileId,
            });
            if (d2) publicProfileRpc = d2;
          }

          if (publicProfileRpc) {
            const aff =
              publicProfileRpc.affiliation ||
              publicProfileRpc.company_affiliation ||
              (Array.isArray(publicProfileRpc.affiliations) ? publicProfileRpc.affiliations[0] : null) ||
              (publicProfileRpc.company_name || publicProfileRpc.company ? publicProfileRpc : null);

            const compName =
              aff?.company_name ||
              aff?.company?.name ||
              aff?.name ||
              publicProfileRpc.company_name ||
              publicProfileRpc.company?.name ||
              null;

            const compId =
              aff?.company_id ||
              aff?.company?.id ||
              aff?.id ||
              publicProfileRpc.company_id ||
              null;

            const affStatus =
              aff?.status ||
              aff?.affiliation_status ||
              publicProfileRpc.affiliation_status ||
              publicProfileRpc.company_link_status ||
              (compId ? "pending" : "active");

            if (compName) {
              setAffiliationInfo({
                name: compName,
                id: compId,
                status: affStatus,
                logo: aff?.logo_url || aff?.company?.logo_url || null,
              });
            }
          }
        } catch (rpcErr) {
          console.warn("Could not load affiliation from get_public_profile:", rpcErr);
        }
        if (session?.user?.id && session.user.id !== profileId) {
          try {
            const status = await checkSenderContactStatus(profileId);
            setContactStatus(status);
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error loading public profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [profileId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const personal = profileData?.personal || {};
  const user = profileData?.user || {};
  const workExperiences = Array.isArray(profileData?.work) ? profileData.work : [];

  // 1. First & Last Name
  const rawFirstName = personal.firstName || user.firstName || "Margare";
  const rawLastName = personal.lastName || user.lastName || "Perez";
  const fullName = `${rawFirstName} ${rawLastName}`.trim();

  // 2. Professional Role Title
  const rawRoleKey = personal.professionalRole || personal.role || "operations_officer";
  const roleTitle =
    personal.professionalTitle ||
    ROLE_DISPLAY_NAMES[rawRoleKey] ||
    (typeof rawRoleKey === "string" ? rawRoleKey.replace(/_/g, " ") : "Operations Officer");

  // 3. Professional Summary
  const summaryText =
    personal.aboutMe ||
    personal.description ||
    "Aviation Operations Specialist with extensive experience in flight scheduling, safety compliance, and crew coordination across commercial airlines.";

  // 4. Avatar Image
  const avatarUrl = user.profileImage || personal.profileImage || personal.avatar;

  // 5. Account & Profile Approval Status ("pending" vs "active")
  const rawStatus =
    user.status ||
    user.account_status ||
    personal.status ||
    personal.approvalStatus ||
    "pending";

  const isApproved = rawStatus === "active" || rawStatus === "approved";
  const isPending = !isApproved;

  // Work Availability Status — E01-HU09
  const userProfile = profileData?.userProfile || {};
  const rawAvailability =
    userProfile?.workAvailabilityStatus ||
    userProfile?.work_availability_status ||
    user?.availability_status ||
    user?.work_availability ||
    personal?.availabilityStatus ||
    personal?.workAvailabilityStatus ||
    "active";

  const isAvailableForWork =
    rawAvailability === "available_for_work" ||
    rawAvailability === "available" ||
    rawAvailability === "#OpenToWork" ||
    rawAvailability === "open_to_work";

  // Dynamic Status Badge & Dot Styling (Orange for Pending, Green for Active)
  const statusBadgeText = isPending ? "Pending" : "Active";
  const statusBadgeStyle = isPending
    ? "bg-orange-100 text-orange-700 border border-orange-200/80"
    : "bg-emerald-50 text-emerald-700 border border-emerald-200/70";

  const statusDotStyle = isPending ? "bg-orange-500" : "bg-emerald-500";

  // 6. Linked Company (Corporate Account / Employer Link — E01-HU11 & E01-HU12 via get_public_profile RPC)
  const companyName = affiliationInfo?.name || "Global Airways";
  const hasCompanyId = Boolean(affiliationInfo?.id);
  const affiliationStatus = affiliationInfo?.status?.toLowerCase();

  const isCompanyPending = hasCompanyId && affiliationStatus === "pending";
  const isCompanyVerified = hasCompanyId && (affiliationStatus === "active" || affiliationStatus === "verified" || affiliationStatus === "approved");
  const companyHref = (isCompanyVerified && affiliationInfo?.id) ? `/profile/${affiliationInfo.id}` : "#";

  // 7. Professional Details Fields
  const locationValue =
    personal.location ||
    user.location ||
    personal.cityCountry ||
    personal.selectedCountry ||
    "Miami, United States";

  const emailValue = personal.email || user.email || "margare.perez@flightcrew.com";
  const phoneValue = personal.phone || user.phone || "+1 (305) 555-0149";
  const licenseValue =
    personal.licenseCertification ||
    personal.licenses ||
    "FAA Dispatcher Certificate (ADX), ICAO Flight Operations Officer";

  // Format Experience string
  let experienceValue = "7+ years • Senior Operations Officer at Global Airways";
  if (workExperiences.length > 0) {
    const firstExp = workExperiences[0];
    const expParts = [firstExp.roleTitle || firstExp.role, firstExp.companyName || firstExp.company].filter(Boolean);
    if (expParts.length > 0) {
      const dateRange = [firstExp.startDate, firstExp.endDate].filter(Boolean).join(" - ");
      experienceValue = `${expParts.join(" at ")}${dateRange ? ` (${dateRange})` : ""}`;
    }
  }

  // Format Languages string
  let languagesValue = "English (Native), Spanish (Fluent), French (Basic)";
  if (personal.languages && Array.isArray(personal.languages) && personal.languages.length > 0) {
    languagesValue = personal.languages
      .map((l: any) => (typeof l === "string" ? l : l.name))
      .join(", ");
  }

  // 8. Skills & Expertise list
  const defaultSkills = [
    "Flight Operations",
    "Safety Management",
    "Compliance",
    "Crew Scheduling",
    "Avionics",
    "Aerodynamics",
  ];
  let skillsList: string[] = defaultSkills;
  if (personal.skills && Array.isArray(personal.skills) && personal.skills.length > 0) {
    skillsList = personal.skills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean);
  } else if (personal.structuredSkills && Array.isArray(personal.structuredSkills) && personal.structuredSkills.length > 0) {
    skillsList = personal.structuredSkills.map((s: any) => s.name).filter(Boolean);
  } else if (profileData?.skills && Array.isArray(profileData.skills) && profileData.skills.length > 0) {
    skillsList = profileData.skills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean);
  } else if (profileData?.data?.skills && Array.isArray(profileData.data.skills) && profileData.data.skills.length > 0) {
    skillsList = profileData.data.skills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-6 px-4">
      {/* Centered Mobile-Width Container */}
      <div className="max-w-md mx-auto flex flex-col gap-4">

        {/* ========================================================
            CARD 1: Profile Header (Horizontal Layout, NO centered)
            ======================================================== */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
          
          <div className="flex items-start justify-between gap-3">
            
            {/* Left Side: Avatar + Name, Role, Summary */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              
              {/* Avatar with Status Badge / Indicator */}
              <div className="relative shrink-0 mt-0.5">
                <div
                  className={cn(
                    "w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden bg-gray-100 border shadow-2xs transition-all duration-300",
                    isAvailableForWork
                      ? "border-2 border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-gray-200"
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1d4ed8] text-white font-extrabold flex items-center justify-center text-xl sm:text-2xl">
                      {rawFirstName[0]?.toUpperCase() || "M"}
                    </div>
                  )}
                </div>

                {/* Status Dot / Badge (Scenario 2: Visible indicator on avatar) */}
                {isAvailableForWork ? (
                  <span
                    className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-xs flex items-center gap-1 z-10 select-none animate-in fade-in"
                    title="Available for Work / #OpenToWork"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                    <span>Open</span>
                  </span>
                ) : (
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs",
                      statusDotStyle
                    )}
                    title={statusBadgeText}
                  />
                )}
              </div>

              {/* Profile Details (Name, Role Pill, Company Link, Summary) */}
              <div className="flex flex-col min-w-0 flex-1">
                
                {/* Full Name: Adjusted to balanced text-xl / text-2xl font-extrabold with break-words */}
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight tracking-tight break-words">
                  {fullName}
                </h1>

                {/* Role Pill: Dynamic width (w-fit) without text truncation */}
                <div className="mt-1 mb-1.5 w-fit">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-[#eff6ff] text-[#1d4ed8] whitespace-nowrap">
                    {roleTitle}
                  </span>
                </div>

                {/* Company Display — E01-HU11 & E01-HU12 (AC 2) */}
                <div className="mb-2">
                  {isCompanyPending ? (
                    <div className="inline-flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-blue-600 text-xs sm:text-sm font-medium">
                        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
                        <span className="truncate">{companyName}</span>
                      </span>
                      <span className="text-orange-500 text-xs font-medium ml-[18px] sm:ml-[22px]">
                        Pending Verification
                      </span>
                    </div>
                  ) : isCompanyVerified ? (
                    <Link
                      href={companyHref}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium cursor-pointer hover:underline transition-colors w-fit"
                      title={`View ${companyName} profile`}
                    >
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
                      <span className="truncate">{companyName}</span>
                    </Link>
                  ) : (
                    /* E01-HU12: Unregistered / Unverified company rendered strictly as plain text */
                    <div className="inline-flex items-center gap-1 text-gray-600 text-xs sm:text-sm font-medium">
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{companyName}</span>
                    </div>
                  )}
                </div>

                {/* Professional Summary */}
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden min-w-0">
                  {summaryText}
                </p>
              </div>

            </div>

            {/* Right Side: Status Badge + Edit Pencil Button (Never Crushed) */}
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap",
                  isAvailableForWork
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                    : statusBadgeStyle
                )}
              >
                {isAvailableForWork && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
                {isAvailableForWork ? "Available for Work" : statusBadgeText}
              </span>

              {isOwnProfile ? (
                <Link
                  href="/onboarding?edit=true&step=1"
                  className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 border border-gray-200/80 flex items-center justify-center text-gray-500 hover:text-[#1d4ed8] transition-colors cursor-pointer shrink-0"
                  title="Edit Profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              ) : contactStatus?.reason === "blocked_by_me" ? (
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition cursor-pointer shrink-0"
                  title="Contact blocked by you"
                >
                  <Ban className="w-3.5 h-3.5 text-red-600" />
                  <span>Blocked</span>
                </button>
              ) : contactStatus?.reason === "business_dms_disabled" ? (
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition cursor-pointer shrink-0"
                  title="Direct messages disabled by company"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>DMs Disabled</span>
                </button>
              ) : contactStatus?.reason === "permanently_declined" || contactStatus?.reason === "blocked" ? (
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 transition cursor-pointer shrink-0"
                  title="Contact permanently restricted"
                >
                  <Ban className="w-3.5 h-3.5 text-gray-400" />
                  <span>Restricted</span>
                </button>
              ) : contactStatus?.reason === "cooldown" ? (
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition cursor-pointer shrink-0"
                  title="72-hour cooldown active"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cooldown ({contactStatus.remainingHours}h)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCheckingConversation}
                  onClick={handleMessageClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                  title="Direct Message"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>
                    {isCheckingConversation
                      ? "Opening..."
                      : contactStatus?.declinedCount === 1
                      ? "Message (Final Try)"
                      : "Message"}
                  </span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================
            CARD 2: Professional Details (Structured Vertical List)
            ======================================================== */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
          
          {/* Section Title (Large: text-xl / text-2xl) */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
            Professional details
          </h2>

          <div className="space-y-5">
            
            {/* 1. Location (Naked MapPin Icon) */}
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-400 font-medium leading-none">Location</span>
                <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                  {locationValue}
                </span>
              </div>
            </div>

            {/* 2. Email (Naked Mail Icon) */}
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-400 font-medium leading-none">Email</span>
                <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                  {emailValue}
                </span>
              </div>
            </div>

            {/* 3. Phone (Naked Phone Icon) */}
            <div className="flex items-start gap-4">
              <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-400 font-medium leading-none">Phone</span>
                <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                  {phoneValue}
                </span>
              </div>
            </div>

            {/* 4. License / Certification (Naked FileText Icon) */}
            <div className="flex items-start gap-4">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-400 font-medium leading-none">License / Certification</span>
                <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                  {licenseValue}
                </span>
              </div>
            </div>

            {/* 5. Experience (Naked Calendar Icon) */}
            <div className="flex items-start gap-4">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-400 font-medium leading-none">Experience</span>
                <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                  {experienceValue}
                </span>
              </div>
            </div>

            {/* 6. Languages (Naked Globe Icon) */}
            <div className="flex items-start gap-4">
              <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-400 font-medium leading-none">Languages</span>
                <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                  {languagesValue}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================
            CARD 3: Skills & Expertise (Generous Padding & Larger Font)
            ======================================================== */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs mb-6">
          
          {/* Section Title (Large: text-xl / text-2xl) */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Skills & Expertise
          </h2>

          <div className="flex flex-wrap gap-2.5">
            {skillsList.map((skill, idx) => (
              <span
                key={idx}
                className="px-4 py-2 sm:px-5 sm:py-2 rounded-full bg-gray-100 text-gray-800 text-sm sm:text-base font-medium border border-gray-200/60"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* HU-01: First-Contact Text-Only Message Request Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">
                    Message Request
                  </h3>
                  <p className="text-[11px] text-gray-500">to {fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMessageModalOpen(false);
                  setRequestError(null);
                }}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Policy Alert */}
            {contactStatus?.declinedCount === 1 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>2nd & Final Request:</strong> Your previous request was declined. This is your second and final text-only request to {fullName}. If declined again, you will be permanently blocked from contacting this user.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Initial contact is strictly limited to <strong>1 text-only message</strong>. Sending attachments or additional messages is disabled until {fullName} accepts.
                </p>
              </div>
            )}

            {/* Error Message */}
            {requestError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                {requestError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSendInitialRequest} className="flex flex-col gap-3">
              <textarea
                rows={4}
                value={messageRequestText}
                onChange={(e) => setMessageRequestText(e.target.value)}
                placeholder={`Introduce yourself to ${fullName}...`}
                maxLength={500}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                <span>Text-only (no attachments)</span>
                <span>{messageRequestText.length}/500</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!messageRequestText.trim() || isSubmittingRequest}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {isSubmittingRequest ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HU-02: Cooldown & Anti-Spam Restriction Details Dialog */}
      {restrictionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {restrictionModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestrictionModal(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {restrictionModal.message}
            </p>
            <button
              type="button"
              onClick={() => setRestrictionModal(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
