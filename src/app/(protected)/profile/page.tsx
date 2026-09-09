"use client";

import React, { useEffect, useState } from "react";
import {
  MapPin,
  Pencil,
  Clock,
  Heart,
  Eye,
  User,
  X,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Globe,
  Calendar,
  FileText,
  Briefcase,
  Plane,
  Building2,
  Users,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Check,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { fetchPosts } from "@/lib/api/posts";
import { PostCard } from "@/components/home/post-card";
import { computeProfileAreas } from "@/utils/profileCompletion";
import { revalidateProfileLayout } from "@/actions/profile";
import { useUserProfile } from "@/components/providers/user-profile-provider";

export default function ProfilePage() {
  const router = useRouter();
  const PlusIcon = Plus;
  const ChevronRightIcon = ChevronRight;
  const BuildingOfficeIcon = Building2;
  const HeartIcon = Heart;
  const EyeIcon = Eye;
  const {
    profileProgress,
    profilePhoto,
    coverPhoto,
    personal: contextPersonal,
    licenses,
    ratings,
    work,
    languages,
    skills,
    resume,
    accountType,
    isBusiness,
    companyInfo,
    affiliationInfo,
    completionAreas,
    completedCount: completedAreasCount,
    totalCount: totalAreasCount,
    missingAreas,
    isLoading: contextLoading,
    refetchProfile,
  } = useUserProfile();

  // Local optimistic state for personal details (e.g. during availability modal toggles)
  const [personal, setPersonal] = useState<any>(null);

  // Sync personal state whenever context loads or updates
  useEffect(() => {
    if (contextPersonal) {
      setPersonal(contextPersonal);
    }
  }, [contextPersonal]);

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Visitors, Likes & Availability modal states
  const [visitors, setVisitors] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const loading = contextLoading;

  // 2. Derived variables (evaluated unconditionally)
  const firstName = personal?.firstName || "";
  const lastName = personal?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Not added";

  // Distinguish Aviation Professional vs Flight Crew
  const isAviationProfessional =
    accountType === "aviation_professional" ||
    personal?.professionalRole === "aviation_professional" ||
    personal?.category === "aviation_professional" ||
    personal?.role === "aviation_professional";

  const isFlightCrew = !isBusiness && !isAviationProfessional;

  const rawRole =
    personal?.professionalRole ||
    personal?.roleTitle ||
    personal?.role ||
    personal?.category ||
    personal?.professionalTitle;

  const roleLabel = isFlightCrew
    ? (rawRole === "crew" || rawRole === "Cabin Crew"
        ? "Cabin Crew"
        : rawRole === "pilot" || rawRole === "Pilot"
        ? "Pilot"
        : rawRole || "Pilot")
    : (rawRole || "Operations Officer");

  const flightHoursValue =
    personal?.totalFlightHours ||
    personal?.flightHours ||
    personal?.flight_hours ||
    null;

  const summaryText =
    personal?.aboutMe ||
    personal?.summary ||
    personal?.description ||
    resume?.summary ||
    null;

  const locationValue = personal?.location || personal?.cityCountry || null;

  const rawStatus = personal?.availabilityStatus || personal?.availability_status || "active";
  const isEmployed = rawStatus === "active" || rawStatus === "employed";
  const statusDisplayText = isEmployed ? "Active / Employed" : "Available for Work";

  const phoneValue = personal?.phone || null;
  const emailValue = personal?.email || null;

  const rawLicenses =
    licenses.length > 0
      ? licenses.map((l: any) => l?.name || l?.licenseName || l)
      : personal?.licenses && Array.isArray(personal.licenses)
      ? personal.licenses
      : personal?.licenseCertification
      ? [personal.licenseCertification]
      : [];
  const licensesList: string[] = rawLicenses.filter(Boolean);

  const ratingsList: string[] = Array.isArray(ratings)
    ? ratings
        .map((r: any) => (typeof r === "string" ? r : r?.ratingName || r?.name || ""))
        .filter(Boolean)
    : [];

  interface RichLicense {
    id?: string;
    name: string;
    number?: string | null;
    expiryDate?: string | null;
    isPermanent?: boolean;
    isExpired?: boolean;
    isExpiringSoon?: boolean;
  }

  const richLicenses: RichLicense[] = (
    licenses.length > 0
      ? licenses
      : Array.isArray(personal?.licenses) && personal.licenses.length > 0
      ? personal.licenses
      : personal?.licenseCertification
      ? [{ name: personal.licenseCertification }]
      : []
  )
    .map((lic: any) => {
      if (!lic) return null;
      if (typeof lic === "string") {
        return { name: lic, number: null, expiryDate: null, isPermanent: false, isExpired: false, isExpiringSoon: false };
      }
      const name = lic.licenseName || lic.name || "Aviation License";
      const number = lic.licenseNumber || lic.number || null;
      const expiryDate = lic.expiryDate || lic.expiry || null;
      const isPermanent = expiryDate === "Permanent" || expiryDate === "N/A";
      let isExpired = false;
      let isExpiringSoon = false;
      if (expiryDate && !isPermanent) {
        const d = new Date(expiryDate);
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          const now = new Date();
          if (now > d) {
            isExpired = true;
          } else {
            const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 60) {
              isExpiringSoon = true;
            }
          }
        }
      }
      return {
        id: lic.id,
        name,
        number,
        expiryDate,
        isPermanent,
        isExpired,
        isExpiringSoon,
      };
    })
    .filter(Boolean) as RichLicense[];

  const getOnboardingStep = (key: string) => {
    if (isFlightCrew) {
      switch (key) {
        case "personal_profile":
        case "professional_profile":
        case "photo":
        case "location":
          return 1;
        case "work_qualifications":
        case "licenses":
          return 2;
        case "aircraft_ratings":
        case "ratings":
          return 3;
        case "career_skills":
        case "work":
          return 4;
        case "languages":
        case "skills":
          return 5;
        case "company_affiliation":
          return 5;
        default:
          return 1;
      }
    }
    // Aviation Professional
    switch (key) {
      case "personal_profile":
      case "photo":
        return 2;
      case "professional_profile":
        return 3;
      case "work_qualifications":
      case "licenses":
        return 4;
      case "location":
      case "career_skills":
      case "work":
      case "languages":
        return 5;
      case "skills":
        return 6;
      default:
        return 5;
    }
  };

  const getMissingAreaLink = (item: any) => {
    return `/onboarding?edit=true&step=${getOnboardingStep(item.key)}`;
  };

  const PENDING_AREA_SUBTITLES: Record<string, string> = {
    personal_profile: "Complete your identity, profile photo, nationality, date of birth, marital status, and children.",
    aircraft_ratings: "Add at least one aircraft type rating.",
    work_qualifications: "Complete your work location, experience, and role details.",
    professional_profile: "Complete your contact details, summary, and English proficiency.",
    career_skills: "Add experience, training, languages, and at least one skill.",
  };

  const ALL_CANONICAL_AREAS = [
    {
      key: "personal_profile",
      label: "Personal profile",
      desc: "Complete your identity, profile photo, nationality, date of birth, marital status, and children.",
    },
    {
      key: "aircraft_ratings",
      label: "Aircraft ratings",
      desc: "Add at least one aircraft type rating.",
    },
    {
      key: "work_qualifications",
      label: "Work and qualifications",
      desc: "Complete your work location, experience, and role details.",
    },
    {
      key: "professional_profile",
      label: "Professional profile",
      desc: "Complete your contact details, summary, and English proficiency.",
    },
    {
      key: "career_skills",
      label: "Career and skills",
      desc: "Add experience, training, languages, and at least one skill.",
    },
  ];

  // Visual QA & debugging override: Always render all 5 profile areas without filtering out completed ones
  const pendingAreas = ALL_CANONICAL_AREAS.map((canon) => {
    const fromContext =
      (completionAreas || []).find((a: any) => a.key === canon.key) ||
      (missingAreas || []).find((a: any) => a.key === canon.key);
    return {
      id: canon.key,
      key: canon.key,
      title: fromContext?.label || canon.label,
      description: PENDING_AREA_SUBTITLES[canon.key] || fromContext?.desc || canon.desc,
      href: getMissingAreaLink(canon),
    };
  });

  const completedCount = completedAreasCount;

  const workExperiences: any[] = Array.isArray(work) && work.length > 0
    ? work
    : Array.isArray(personal?.workExperiences)
    ? personal.workExperiences
    : [];

  const rawSkills =
    skills.length > 0
      ? skills
      : personal?.skills && Array.isArray(personal.skills)
      ? personal.skills
      : personal?.structuredSkills && Array.isArray(personal.structuredSkills)
      ? personal.structuredSkills.map((s: any) => s.name)
      : resume?.skills || [];
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s: any) => (typeof s === "string" ? s : s.name || s.label)).filter(Boolean)
    : [];

  const languagesList: string[] = Array.isArray(languages) && languages.length > 0
    ? languages
    : Array.isArray(personal?.languages)
    ? personal.languages
    : [];

  const affiliationName = affiliationInfo?.name || personal?.companyName || personal?.linkedCompany || null;
  const hasAffiliationId = Boolean(affiliationInfo?.id);
  const isAffiliationVerified = hasAffiliationId && (affiliationInfo?.status === "active" || affiliationInfo?.status === "approved");
  const isAffiliationPending = hasAffiliationId && affiliationInfo?.status === "pending";

  const completionPercentage = profileProgress;

  // 3. Scroll to top on mount and when loading finishes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!loading) {
      window.scrollTo(0, 0);
    }
  }, [loading]);

  // Load user posts
  useEffect(() => {
    async function loadUserPosts() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setCurrentUserId(session.user.id);
          const allPosts = await fetchPosts();
          setUserPosts(allPosts.filter((p) => p.user_id === session.user.id));
        }
      } catch (err) {
        console.error("Error loading user posts:", err);
      }
    }
    loadUserPosts();
  }, []);

  // Handlers for Modals
  const handleOpenVisitorsModal = async () => {
    if (!currentUserId) return;
    setShowVisitorsModal(true);
    setLoadingVisitors(true);
    try {
      const { data: visitsData } = await supabase
        .from("profile_visits")
        .select("*")
        .eq("profile_user_id", currentUserId)
        .order("last_visited_at", { ascending: false });

      if (visitsData && visitsData.length > 0) {
        const visitorIds = Array.from(
          new Set(visitsData.map((v) => v.visitor_user_id || v.visitor_id).filter(Boolean))
        );

        if (visitorIds.length > 0) {
          const [{ data: usersData }, { data: companiesData }] = await Promise.all([
            supabase
              .from("users")
              .select("id, firstName, lastName, username, profileImage")
              .in("id", visitorIds),
            supabase
              .from("companies")
              .select("owner_user_id, name, logo_url")
              .in("owner_user_id", visitorIds),
          ]);

          const compMap = new Map((companiesData || []).map((c) => [c.owner_user_id, c]));
          const userMap = new Map(
            (usersData || []).map((u) => {
              const comp = compMap.get(u.id);
              return [
                u.id,
                {
                  ...u,
                  companyName: comp?.name || null,
                  profileImage: u.profileImage || comp?.logo_url || null,
                },
              ];
            })
          );

          const formatted = visitsData.map((v) => {
            const vId = v.visitor_user_id || v.visitor_id;
            const usr =
              userMap.get(vId) ||
              (compMap.has(vId)
                ? {
                    id: vId,
                    companyName: compMap.get(vId)?.name,
                    profileImage: compMap.get(vId)?.logo_url,
                  }
                : null);
            return {
              ...v,
              visitor_id: vId,
              created_at: v.last_visited_at || v.first_visited_at || v.created_at,
              user: usr,
            };
          });
          setVisitors(formatted);
        } else {
          setVisitors(visitsData);
        }
      } else {
        setVisitors([]);
      }
    } catch (err) {
      console.error("Error fetching visitors:", err);
    } finally {
      setLoadingVisitors(false);
    }
  };

  const handleOpenLikersModal = async () => {
    if (!currentUserId) return;
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      const { data: likesData } = await supabase
        .from("profile_likes")
        .select("*")
        .eq("profile_user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (likesData && likesData.length > 0) {
        const likerIds = Array.from(
          new Set(likesData.map((l) => l.liker_user_id || l.liker_id).filter(Boolean))
        );

        if (likerIds.length > 0) {
          const [{ data: usersData }, { data: companiesData }] = await Promise.all([
            supabase
              .from("users")
              .select("id, firstName, lastName, username, profileImage")
              .in("id", likerIds),
            supabase
              .from("companies")
              .select("owner_user_id, name, logo_url")
              .in("owner_user_id", likerIds),
          ]);

          const compMap = new Map((companiesData || []).map((c) => [c.owner_user_id, c]));
          const userMap = new Map(
            (usersData || []).map((u) => {
              const comp = compMap.get(u.id);
              return [
                u.id,
                {
                  ...u,
                  companyName: comp?.name || null,
                  profileImage: u.profileImage || comp?.logo_url || null,
                },
              ];
            })
          );

          const formatted = likesData.map((l) => {
            const lId = l.liker_user_id || l.liker_id;
            const usr =
              userMap.get(lId) ||
              (compMap.has(lId)
                ? {
                    id: lId,
                    companyName: compMap.get(lId)?.name,
                    profileImage: compMap.get(lId)?.logo_url,
                  }
                : null);
            return {
              ...l,
              liker_id: lId,
              user: usr,
            };
          });
          setLikers(formatted);
        } else {
          setLikers(likesData);
        }
      } else {
        setLikers([]);
      }
    } catch (err) {
      console.error("Error fetching likers:", err);
    } finally {
      setLoadingLikers(false);
    }
  };

  // 4. EARLY RETURNS (Placed strictly after all hooks)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ==========================================
  // BUSINESS PROFILE VIEW (Refactored Clean Cards)
  // ==========================================
  if (isBusiness) {
    const isApproved = companyInfo?.status === "active" || companyInfo?.status === "approved";
    const companyTypesList =
      companyInfo?.types && companyInfo.types.length > 0
        ? companyInfo.types
        : companyInfo?.services && companyInfo.services.length > 0
        ? companyInfo.services
        : ["Airline / Operator"];

    return (
      <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 sm:px-0 py-6 md:py-8 gap-5">
        {/* 1. Header Card */}
        <div className="bg-white rounded-3xl p-6 flex flex-col shadow-xs border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-xs">
              {companyInfo?.logo ? (
                <img src={companyInfo.logo} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <h1 className="text-xl font-extrabold text-gray-900 leading-tight truncate">
                    {companyInfo?.name || "Company Name"}
                  </h1>
                  {isApproved ? (
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full text-xs font-bold inline-flex items-center">
                      Active
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 px-3 py-0.5 rounded-full text-xs font-bold inline-flex items-center">
                      Pending review
                    </span>
                  )}
                </div>
                <Link
                  href="/onboarding-business?edit=company&from=profile"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all shadow-2xs shrink-0 cursor-pointer"
                  title="Edit company profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>
              </div>
              <span className="text-xs text-gray-500 mt-1 font-medium">Corporate associate account</span>
            </div>
          </div>
        </div>

        {/* 2. Metric Buttons (Quick Action) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenLikersModal}
            className="flex-1 max-w-[170px] py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
          >
            <Heart className="w-4 h-4 text-[#1d4ed8] shrink-0" />
            <span>Profile likes ({likers.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenVisitorsModal}
            className="flex-1 max-w-[170px] py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
          >
            <Eye className="w-4 h-4 text-[#1d4ed8] shrink-0" />
            <span>Profile visitors ({visitors.length})</span>
          </button>
        </div>

        {/* 3. People & Affiliations Section */}
        <div className="bg-white rounded-3xl p-6 flex flex-col shadow-xs border border-gray-100">
          <h2 className="font-extrabold text-base text-gray-900 mb-1">People & affiliations</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            <Link
              href="/business/professionals"
              className="flex items-center justify-between py-4 px-1 hover:bg-gray-50/60 rounded-xl transition-colors group cursor-pointer"
            >
              <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">
                Affiliated professionals
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1d4ed8] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/business/requests"
              className="flex items-center justify-between py-4 px-1 hover:bg-gray-50/60 rounded-xl transition-colors group cursor-pointer"
            >
              <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">
                Affiliation requests
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1d4ed8] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/business/invitations"
              className="flex items-center justify-between py-4 px-1 hover:bg-gray-50/60 rounded-xl transition-colors group cursor-pointer"
            >
              <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">
                Company invitations
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1d4ed8] group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* 4. Company Details Section */}
        <div className="bg-white rounded-3xl p-6 flex flex-col shadow-xs border border-gray-100 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-gray-900">Company details</h2>
            <Link
              href="/onboarding-business?edit=company&from=profile"
              className="text-[#1d4ed8] hover:text-[#1e40af] transition-colors p-1"
              title="Edit company details"
            >
              <Pencil className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3.5">
            {companyInfo?.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{companyInfo.location}</p>
                </div>
              </div>
            )}
            {companyInfo?.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{companyInfo.email}</p>
                </div>
              </div>
            )}
            {companyInfo?.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{companyInfo.phone}</p>
                </div>
              </div>
            )}
            {companyInfo?.website && (
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Website</p>
                  <p className="text-sm font-semibold text-gray-900">{companyInfo.website}</p>
                </div>
              </div>
            )}
            {companyInfo?.foundedYear && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Founded</p>
                  <p className="text-sm font-semibold text-gray-900">{companyInfo.foundedYear}</p>
                </div>
              </div>
            )}
            {companyInfo?.description && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{companyInfo.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Company Types Section */}
        {companyTypesList.length > 0 && (
          <div className="bg-white rounded-3xl p-6 flex flex-col shadow-xs border border-gray-100 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base text-gray-900">Company types</h2>
              <Link
                href="/onboarding-business?edit=company&from=profile"
                className="text-[#1d4ed8] hover:text-[#1e40af] transition-colors p-1"
                title="Edit company types"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {companyTypesList.map((type, idx) => (
                <span
                  key={idx}
                  className="bg-[#eef4ff] text-[#1d4ed8] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold leading-tight"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 5. AVIATION PROFESSIONAL & FLIGHT CREW PROFILE (Main View)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12 w-full">
      <div className="max-w-lg mx-auto w-full px-4 sm:px-0 flex flex-col gap-6">

        {/* 1. Hero Section: Centralized Cover Banner & Overlapping Avatar */}
        <div className="w-full relative">
          {/* Cover Photo Container: overflow-hidden clips scaled blurred edges cleanly */}
          <div className="w-full h-48 sm:h-56 overflow-hidden bg-slate-200 shadow-xs relative">
            <img
              src={coverPhoto || profilePhoto || "https://api.dicebear.com/7.x/shapes/svg?seed=user"}
              alt="Cover photo"
              className="w-full h-full object-cover blur-sm scale-105 brightness-90 block"
            />
          </div>

          {/* Overlapping Avatar: Absolute centered, top half on cover & bottom half on gray page background */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-14 sm:-bottom-16 z-20">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md bg-slate-800 overflow-hidden flex items-center justify-center">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 text-white font-extrabold flex items-center justify-center text-3xl">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Edit Pencil Icon on Avatar */}
              <Link
                href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=2"}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700 hover:text-[#1d4ed8] hover:bg-gray-50 transition-colors cursor-pointer"
                title="Edit photo"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Main Info, Status, Interaction Buttons & Professional Summary Paragraph */}
        <div className="pt-12 sm:pt-14 w-full flex flex-col items-center text-center">
          {/* Full Name */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {fullName}
          </h1>

          {/* Role in blue */}
          <p className="text-sm sm:text-base font-bold text-[#1d4ed8] mt-1 capitalize">
            {roleLabel}
          </p>

          {/* Location subtext with interactive navigation shortcut */}
          {locationValue ? (
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=5&section=location"}
              className="text-xs sm:text-sm text-gray-500 hover:text-[#1d4ed8] mt-1 inline-flex items-center justify-center gap-1 transition-colors group cursor-pointer"
              title="Edit Location"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
              <span className="group-hover:underline underline-offset-2">{locationValue}</span>
              <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-80 transition-opacity ml-0.5" />
            </Link>
          ) : (
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=5&section=location"}
              className="text-xs text-[#1d4ed8] hover:text-[#1e40af] font-semibold mt-1 inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Add location</span>
            </Link>
          )}

          {/* Status Pill Badge: Only for aviation_professional, hidden completely for all flight_crew accounts (Pilot/Crew) */}
          {isAviationProfessional && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(true)}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500 text-emerald-600 bg-transparent text-xs font-bold hover:bg-emerald-50/50 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Change availability status"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{statusDisplayText}</span>
                <Pencil className="w-3 h-3 text-emerald-500 ml-0.5 opacity-80" />
              </button>
            </div>
          )}

        </div>

        {isFlightCrew ? (
          <>
            {/* 1. BOTONES DE LIKES Y VISITANTES */}
            <div className="flex justify-center gap-4 mt-4 mb-8">
              <button
                type="button"
                onClick={handleOpenLikersModal}
                className="flex items-center gap-2 border border-blue-600 text-blue-600 px-5 py-2 rounded-full font-semibold text-sm"
              >
                <HeartIcon className="w-4 h-4" /> Profile likes
              </button>
              <button
                type="button"
                onClick={handleOpenVisitorsModal}
                className="flex items-center gap-2 border border-blue-600 text-blue-600 px-5 py-2 rounded-full font-semibold text-sm"
              >
                <EyeIcon className="w-4 h-4" /> Profile visitors
              </button>
            </div>

            {/* 2. ENCABEZADO "COMPLETE YOUR PROFILE" (FONDO TRANSPARENTE) */}
            <div className="flex justify-between items-start mb-4 px-1 bg-transparent">
              <div>
                <h2 className="text-[20px] font-bold text-gray-900 leading-tight">Complete your profile</h2>
                <p className="text-[14px] text-gray-500 mt-0.5">1 of 6 profile areas complete</p>
              </div>
              <div className="bg-[#E6F4EA] text-[#137333] px-3 py-1 rounded-[8px] text-sm font-bold">
                15%
              </div>
            </div>

            {/* 3. LAS 5 TARJETAS DE PROGRESO (LISTA VERTICAL) */}
            <div className="flex flex-col gap-3">
              
              {/* Tarjeta 1: Personal profile */}
              <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                  <PlusIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900">Personal profile</h3>
                  <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Complete your identity, profile photo, nationality, date of birth, marital status, and children.</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              {/* Tarjeta 2: Aircraft ratings */}
              <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                  <PlusIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900">Aircraft ratings</h3>
                  <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Add at least one aircraft type rating.</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              {/* Tarjeta 3: Work and qualifications */}
              <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                  <PlusIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900">Work and qualifications</h3>
                  <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Complete your work location, experience, and role details.</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              {/* Tarjeta 4: Professional profile */}
              <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                  <PlusIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900">Professional profile</h3>
                  <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Complete your contact details, summary, and English proficiency.</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              {/* Tarjeta 5: Career and skills */}
              <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                  <PlusIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900">Career and skills</h3>
                  <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Add experience, training, languages, and at least one skill.</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

            </div>

            {/* --- INICIO SECCIONES INFERIORES --- */}

            {/* 1. COMPANY AFFILIATION */}
            <div className="mt-8 mb-6">
              <h3 className="text-[15px] font-bold text-gray-900 mb-3 px-1">Company affiliation</h3>
              <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-gray-100 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-bold text-gray-900">Link your employer</h4>
                  <p className="text-[13px] text-gray-500 leading-tight mt-0.5">Search registered companies and request verification.</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* 2. PILOT BADGE / WINGS CARD */}
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 mb-4 relative">
              <button className="absolute top-4 right-4 text-blue-600 font-semibold text-sm">Edit</button>
              
              <div className="flex flex-col items-center justify-center mb-6 mt-4">
                 {/* Aquí va el componente o imagen de las alas */}
                 <Image alt="Titanium Badge" className="object-contain mb-3" height={80} src="/silver.png" width={192}/>
                 <h3 className="text-lg font-bold text-gray-900">Titanium</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Flight hours</p>
                  <p className="text-base font-medium text-gray-900">946464</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nationality</p>
                  <p className="text-base font-medium text-gray-900">United States</p>
                </div>
              </div>
            </div>

            {/* 3. LICENSES CARD */}
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 mb-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-bold text-gray-900">Licenses</h3>
                <button className="text-blue-600 font-semibold text-sm">Manage</button>
              </div>
              
              <div className="flex justify-between items-center">
                 <div>
                   <p className="text-base font-bold text-gray-900 leading-snug">
                     ABPL - Aerostatic<br/>Balloon Pilot<br/>License
                   </p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm text-gray-900">sep. de 2026</p>
                   <p className="text-xs text-gray-500 mt-1">Medical certificate expires in 16 days</p>
                 </div>
              </div>
            </div>

            {/* --- FIN SECCIONES INFERIORES --- */}
          </>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {/* 2. BOTONES DE INTERACCIÓN (Profile Likes & Profile Visitors) */}
            <div className="flex justify-center items-center gap-3.5 mt-4 w-full">
              <button
                type="button"
                onClick={handleOpenLikersModal}
                className="flex-1 max-w-[160px] py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              >
                <Heart className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                <span>Profile likes</span>
              </button>

              <button
                type="button"
                onClick={handleOpenVisitorsModal}
                className="flex-1 max-w-[160px] py-2.5 px-4 rounded-full border border-[#1d4ed8] text-[#1d4ed8] bg-transparent hover:bg-blue-50/60 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              >
                <Eye className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                <span>Profile visitors</span>
              </button>
            </div>

            {/* TOP PROGRESS SECTION (Profile Completion) */}
            <div className="flex justify-between items-center mb-4 px-1 bg-transparent">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Complete your profile</h2>
                <p className="text-sm text-gray-500 mt-0.5">{completedCount} of 5 profile areas complete</p>
              </div>
              <div className="bg-[#E6F4EA] text-[#137333] px-3 py-1 rounded-lg text-sm font-bold">
                {profileProgress}%
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              {pendingAreas.map((area) => (
                <div
                  key={area.id}
                  onClick={() => router.push(area.href)}
                  className="bg-white rounded-[20px] p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <PlusIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-gray-900">{area.title}</h3>
                    <p className="text-[13px] text-gray-500 leading-tight mt-0.5">{area.description}</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>

        {/* COMPANY AFFILIATION SECTION */}
        <div className="mt-8 mb-4">
          {/* Small floating section label on the gray background */}
          <h3 className="text-[15px] font-bold text-gray-900 mb-3 px-1">Company affiliation</h3>
          
          {/* Single flat card */}
          <div
            onClick={() => router.push("/business/affiliate")}
            className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-sm cursor-pointer border border-gray-100"
          >
            {/* Left: Blue Building Icon */}
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-500" /> 
            </div>
            
            {/* Middle: Text Stack */}
            <div className="flex-1">
              <h4 className="text-[15px] font-bold text-gray-900">
                {affiliationName || "Link your employer"}
              </h4>
              <p className="text-[13px] text-gray-500 leading-tight mt-0.5">
                {affiliationName
                  ? isAffiliationPending
                    ? "Pending Verification"
                    : isAffiliationVerified
                    ? "Verified Company"
                    : "Search registered companies and request verification."
                  : "Search registered companies and request verification."}
              </p>
            </div>
            
            {/* Right: Chevron */}
            <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>

        {/* =========================================================================
            CORE PROFILE CARDS (Aviation Professional Detailed Profile)
            Hidden completely for Flight Crew accounts to match clean mobile interface
            ========================================================================= */}
        {isAviationProfessional && (
          <>
            {/* SECTION 1: Personal profile */}
            <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Personal profile
                </h2>
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Basic details & contact information</span>
              </div>
            </div>
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=2"}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </Link>
          </div>

          <div className="divide-y divide-gray-100 space-y-2 pt-1">
            {/* Location */}
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=5&section=location"}
              className="flex items-center justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Location</span>
                  <span className={cn("text-xs sm:text-sm font-semibold truncate", locationValue ? "text-gray-900" : "text-gray-400 font-normal")}>
                    {locationValue || "Add your location"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
            </Link>

            {/* Phone */}
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=2"}
              className="pt-2 flex items-center justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Phone</span>
                  <span className={cn("text-xs sm:text-sm font-semibold truncate", phoneValue ? "text-[#1d4ed8]" : "text-gray-400 font-normal")}>
                    {phoneValue || "Not added"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
            </Link>

            {/* Contact Email */}
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=2"}
              className="pt-2 flex items-center justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Contact Email</span>
                  <span className={cn("text-xs sm:text-sm font-semibold truncate", emailValue ? "text-[#1d4ed8]" : "text-gray-400 font-normal")}>
                    {emailValue || "Not added"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* SECTION 2: Aircraft ratings / Type ratings */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center shrink-0">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Aircraft ratings
                </h2>
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Certified aircraft models</span>
              </div>
            </div>
            <Link
              href="/onboarding?edit=true&step=3"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {ratingsList.length > 0 ? (
                <>
                  <Pencil className="w-3 h-3" />
                  <span>Manage</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </>
              )}
            </Link>
          </div>

          {ratingsList.length > 0 ? (
            <Link
              href="/onboarding?edit=true&step=3"
              className="flex items-center justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group"
              title="Manage Type Ratings"
            >
              <div className="flex flex-wrap gap-2 min-w-0">
                {ratingsList.map((rating, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 bg-blue-50/70 border border-blue-200/80 text-[#1d4ed8] group-hover:bg-blue-100/70 rounded-2xl px-4 py-2 text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Plane className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                    <span>{rating}</span>
                  </div>
                ))}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0 ml-2" />
            </Link>
          ) : (
            <Link
              href="/onboarding?edit=true&step=3"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">Add aircraft ratings</span>
                <span className="text-xs text-gray-400">Certified aircraft models (e.g. A320, B737, Embraer)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center transition-all">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors" />
              </div>
            </Link>
          )}
        </div>

        {/* SECTION 3: Work and qualifications */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Work and qualifications
                </h2>
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Licenses & credentials with validity tags</span>
              </div>
            </div>
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=2" : "/onboarding?edit=true&step=4"}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {richLicenses.length > 0 ? (
                <>
                  <Pencil className="w-3 h-3" />
                  <span>Manage</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </>
              )}
            </Link>
          </div>

          {richLicenses.length > 0 ? (
            <div className="divide-y divide-gray-100 space-y-3 pt-1">
              {richLicenses.map((lic, idx) => (
                <Link
                  key={lic.id || idx}
                  href={isFlightCrew ? "/onboarding?edit=true&step=2" : "/onboarding?edit=true&step=4"}
                  className="flex items-start justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 border border-transparent hover:border-blue-100 transition-all cursor-pointer group"
                  title="Manage Qualification"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 text-[#1d4ed8] group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center shrink-0 transition-colors mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors truncate">
                        {lic.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {lic.number && (
                          <span className="text-xs text-gray-500 font-medium">
                            #{lic.number}
                          </span>
                        )}
                        {lic.isPermanent ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Permanent
                          </span>
                        ) : lic.isExpired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Expired ({lic.expiryDate})
                          </span>
                        ) : lic.isExpiringSoon ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Expiring soon ({lic.expiryDate})
                          </span>
                        ) : lic.expiryDate ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Expires {lic.expiryDate}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] shrink-0 transition-colors mt-2" />
                </Link>
              ))}
            </div>
          ) : (
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=2" : "/onboarding?edit=true&step=4"}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">Add aviation license</span>
                <span className="text-xs text-gray-400">ATPL, CPL, Cabin Crew Attestation, or Medical</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center transition-all">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors" />
              </div>
            </Link>
          )}
        </div>

        {/* SECTION 4: Professional profile */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Professional profile
                </h2>
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Total flight hours & career summary/bio</span>
              </div>
            </div>
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=3"}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </Link>
          </div>

          {/* Flight hours highlight box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-100/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {flightHoursValue ? `${Number(flightHoursValue).toLocaleString()} hrs` : "0 hrs"}
              </span>
              <span className="text-xs text-gray-500 font-medium mt-0.5">
                {flightHoursValue ? "Total cumulative flight hours" : "No flight hours recorded yet"}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 shadow-2xs flex items-center justify-center text-[#1d4ed8]">
              <Plane className="w-6 h-6" />
            </div>
          </div>

          {/* Professional summary & bio */}
          <Link
            href={isFlightCrew ? "/onboarding?edit=true&step=1" : "/onboarding?edit=true&step=3"}
            className="pt-1 p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group block"
            title="Edit Summary"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Career Summary & Bio
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
            </div>
            {summaryText ? (
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal group-hover:text-gray-900 transition-colors">
                {summaryText}
              </p>
            ) : (
              <p className="text-xs text-gray-400 font-medium italic">
                No career summary added yet. Click to add your bio.
              </p>
            )}
          </Link>
        </div>

        {/* SECTION 5: Career and skills */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Career and skills
                </h2>
                <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Work history, languages & skills</span>
              </div>
            </div>
            <Link
              href={isFlightCrew ? "/onboarding?edit=true&step=4" : "/onboarding?edit=true&step=5"}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {workExperiences.length > 0 || skillsList.length > 0 ? (
                <>
                  <Pencil className="w-3 h-3" />
                  <span>Manage</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </>
              )}
            </Link>
          </div>

          <div className="divide-y divide-gray-100 space-y-4 pt-1">
            {/* Work history */}
            <div className="pt-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Work history
                </span>
                <Link
                  href={isFlightCrew ? "/onboarding?edit=true&step=4" : "/onboarding?edit=true&step=5&section=work"}
                  className="text-xs text-[#1d4ed8] hover:underline font-semibold"
                >
                  {workExperiences.length > 0 ? "Manage" : "Add"}
                </Link>
              </div>

              {workExperiences.length > 0 ? (
                <div className="space-y-1.5 pt-0.5">
                  {workExperiences.map((exp: any, idx: number) => (
                    <Link
                      key={exp.id || idx}
                      href={isFlightCrew ? "/onboarding?edit=true&step=4" : "/onboarding?edit=true&step=5&section=work"}
                      className="flex items-start justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 border border-transparent hover:border-blue-100 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Briefcase className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] shrink-0 mt-0.5 transition-colors" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors truncate">
                            {exp.roleTitle || exp.jobTitle || "Aviation Professional"}
                          </span>
                          <span className="text-xs text-gray-500 font-medium truncate">
                            {exp.companyName || exp.company || "Airline"} {exp.startDate ? `• ${exp.startDate} - ${exp.endDate || "Present"}` : ""}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] shrink-0 transition-colors mt-1" />
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href={isFlightCrew ? "/onboarding?edit=true&step=4" : "/onboarding?edit=true&step=5&section=work"}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <span className="text-sm text-gray-400 group-hover:text-gray-700 font-medium">No experience added</span>
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center transition-all">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </Link>
              )}
            </div>

            {/* Languages */}
            <div className="pt-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Languages
                </span>
                <Link
                  href={isFlightCrew ? "/onboarding?edit=true&step=5" : "/onboarding?edit=true&step=5&section=languages"}
                  className="text-xs text-[#1d4ed8] hover:underline font-semibold"
                >
                  {languagesList.length > 0 ? "Edit" : "Add"}
                </Link>
              </div>

              {languagesList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {languagesList.map((lang, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 border border-gray-200/80 text-gray-800 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium">No languages added</p>
              )}
            </div>

            {/* Skills & Expertise */}
            <div className="pt-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Skills & Expertise
                </span>
                <Link
                  href={isFlightCrew ? "/onboarding?edit=true&step=5" : "/onboarding?edit=true&step=6"}
                  className="text-xs text-[#1d4ed8] hover:underline font-semibold"
                >
                  {skillsList.length > 0 ? "Edit" : "Add"}
                </Link>
              </div>

              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 border border-gray-200/80 text-gray-800 rounded-full px-3.5 py-1 text-xs font-semibold shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium">No skills added</p>
              )}
            </div>
          </div>
        </div>
          </>
        )}
          </div>
        )}

        {/* User Posts Section */}
        {userPosts.length > 0 && (
          <div className="flex flex-col gap-4 mt-2">
            <h2 className="text-base font-extrabold text-gray-900 px-1">
              Recent activity
            </h2>
            <div className="space-y-4">
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  user={{
                    name: fullName !== "Not added" ? fullName : "User",
                    avatar: profilePhoto || "https://api.dicebear.com/7.x/shapes/svg?seed=user",
                  }}
                  date={post.created_at}
                  content={post.text}
                  image={post.image || undefined}
                  likes={post.likes}
                  liked={post.liked}
                  comments={post.comments}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* =========================================================================
          MODALS: Profile Visitors & Profile Likes (Overlays)
          ========================================================================= */}
      {showVisitorsModal && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col w-full h-full max-w-lg mx-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 relative bg-white shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setShowVisitorsModal(false)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-base sm:text-lg text-gray-900 absolute left-1/2 -translate-x-1/2">
              Profile Visitors
            </h1>
            <div className="w-10 h-10 opacity-0 pointer-events-none" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {loadingVisitors ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Loading profile visitors...
              </div>
            ) : visitors.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm font-medium">
                No profile visitors yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {visitors.map((visit, index) => {
                  const visitorUser = visit.user;
                  const name = visitorUser
                    ? visitorUser.companyName ||
                      [visitorUser.firstName, visitorUser.lastName].filter(Boolean).join(" ").trim() ||
                      visitorUser.username ||
                      "User"
                    : "User";

                  return (
                    <Link
                      key={visit.id || index}
                      href={`/profile/${visit.visitor_id || visit.visitor_user_id}`}
                      onClick={() => setShowVisitorsModal(false)}
                      className="flex items-center justify-between p-3.5 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200/70 shadow-xs group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {visitorUser?.profileImage ? (
                          <img
                            src={visitorUser.profileImage}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-100 border border-gray-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#1d4ed8] text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs">
                            {name[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-[#1d4ed8] transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {visit.created_at || visit.last_visited_at
                              ? `Visited ${new Date(visit.created_at || visit.last_visited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                              : "Visited"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showLikersModal && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col w-full h-full max-w-lg mx-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 relative bg-white shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setShowLikersModal(false)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-base sm:text-lg text-gray-900 absolute left-1/2 -translate-x-1/2">
              Profile Likes
            </h1>
            <div className="w-10 h-10 opacity-0 pointer-events-none" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {loadingLikers ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Loading profile likes...
              </div>
            ) : likers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm font-medium">
                No profile likes yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {likers.map((like, index) => {
                  const likerUser = like.user;
                  const name = likerUser
                    ? likerUser.companyName ||
                      [likerUser.firstName, likerUser.lastName].filter(Boolean).join(" ").trim() ||
                      likerUser.username ||
                      "User"
                    : "User";

                  return (
                    <Link
                      key={like.id || index}
                      href={`/profile/${like.liker_id || like.liker_user_id}`}
                      onClick={() => setShowLikersModal(false)}
                      className="flex items-center justify-between p-3.5 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200/70 shadow-xs group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {likerUser?.profileImage ? (
                          <img
                            src={likerUser.profileImage}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-100 border border-gray-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#1d4ed8] text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs">
                            {name[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-[#1d4ed8] transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {like.created_at
                              ? `Liked ${new Date(like.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                              : "Liked"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Work Availability Modal ── */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Title & Subtitle */}
            <div className="space-y-1 text-left">
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">
                Work availability
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-normal">
                Choose what other professionals and companies see on your profile.
              </p>
            </div>

            {/* Availability Options */}
            <div className="flex flex-col gap-2.5 pt-2">
              {/* Option 1: AVAILABLE FOR WORK */}
              <button
                type="button"
                onClick={async () => {
                  setPersonal((prev: any) => ({
                    ...(prev || {}),
                    availabilityStatus: "available",
                    availability_status: "available",
                  }));
                  setShowAvailabilityModal(false);

                  try {
                    const savedPersonal = localStorage.getItem("onboarding_personal");
                    const parsed = savedPersonal ? JSON.parse(savedPersonal) : {};
                    parsed.availabilityStatus = "available";
                    parsed.availability_status = "available";
                    parsed.workAvailability = "available";
                    localStorage.setItem("onboarding_personal", JSON.stringify(parsed));
                  } catch (e) {}

                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                      await supabase.from("users").update({
                        availability_status: "available",
                        work_availability: "available",
                      }).eq("id", session.user.id);

                      const { data: resumeData } = await supabase.from("resumes").select("data").eq("userId", session.user.id).maybeSingle();
                      if (resumeData?.data) {
                        const currentData = resumeData.data as any;
                        await supabase.from("resumes").update({
                          data: {
                            ...currentData,
                            personal: { ...(currentData.personal || {}), availabilityStatus: "available", workAvailability: "available" },
                          },
                        }).eq("userId", session.user.id);
                      }

                      // Re-fetch get_my_profile RPC and revalidate server layout
                      await supabase.rpc("get_my_profile");
                      await revalidateProfileLayout();
                      await refetchProfile();
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("profile-updated"));
                      }
                    }
                  } catch (err) {
                    console.error("Error syncing availability:", err);
                  }
                }}
                className={cn(
                  "w-full py-4 px-4 sm:px-5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer",
                  !isEmployed
                    ? "bg-gray-50 border border-gray-200/80 font-bold"
                    : "hover:bg-gray-50/70 border border-transparent font-semibold"
                )}
              >
                <span className="text-xs sm:text-sm text-gray-900 uppercase tracking-wider font-extrabold">
                  AVAILABLE FOR WORK
                </span>
                {!isEmployed && (
                  <Check className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                )}
              </button>

              {/* Option 2: ACTIVE / EMPLOYED */}
              <button
                type="button"
                onClick={async () => {
                  setPersonal((prev: any) => ({
                    ...(prev || {}),
                    availabilityStatus: "active",
                    availability_status: "active",
                  }));
                  setShowAvailabilityModal(false);

                  try {
                    const savedPersonal = localStorage.getItem("onboarding_personal");
                    const parsed = savedPersonal ? JSON.parse(savedPersonal) : {};
                    parsed.availabilityStatus = "active";
                    parsed.availability_status = "active";
                    parsed.workAvailability = "active";
                    localStorage.setItem("onboarding_personal", JSON.stringify(parsed));
                  } catch (e) {}

                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                      await supabase.from("users").update({
                        availability_status: "active",
                        work_availability: "active",
                      }).eq("id", session.user.id);

                      const { data: resumeData } = await supabase.from("resumes").select("data").eq("userId", session.user.id).maybeSingle();
                      if (resumeData?.data) {
                        const currentData = resumeData.data as any;
                        await supabase.from("resumes").update({
                          data: {
                            ...currentData,
                            personal: { ...(currentData.personal || {}), availabilityStatus: "active", workAvailability: "active" },
                          },
                        }).eq("userId", session.user.id);
                      }

                      // Re-fetch get_my_profile RPC and revalidate server layout
                      await supabase.rpc("get_my_profile");
                      await revalidateProfileLayout();
                      await refetchProfile();
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("profile-updated"));
                      }
                    }
                  } catch (err) {
                    console.error("Error syncing availability:", err);
                  }
                }}
                className={cn(
                  "w-full py-4 px-4 sm:px-5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer",
                  isEmployed
                    ? "bg-gray-50 border border-gray-200/80 font-bold"
                    : "hover:bg-gray-50/70 border border-transparent font-semibold"
                )}
              >
                <span className="text-xs sm:text-sm text-gray-900 uppercase tracking-wider font-extrabold">
                  ACTIVE / EMPLOYED
                </span>
                {isEmployed && (
                  <Check className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Cancel Action Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                className="py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-wider cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
