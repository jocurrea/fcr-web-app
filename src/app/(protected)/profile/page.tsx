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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { fetchPosts } from "@/lib/api/posts";
import { PostCard } from "@/components/home/post-card";
import { computeProfileAreas } from "@/utils/profileCompletion";
import { revalidateProfileLayout } from "@/actions/profile";

export default function ProfilePage() {
  // 1. All useState Hooks
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [personal, setPersonal] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [work, setWork] = useState<any>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);

  // Account type & profile flags
  const [accountType, setAccountType] = useState<string>("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    status: string;
    logo?: string | null;
    location?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    description?: string | null;
    foundedYear?: number | string | null;
    operatingAreas?: string[];
    services?: string[];
    fleetTypes?: string[];
    types?: string[];
  } | null>(null);

  // Affiliation Info (E01-HU11 & E01-HU12 via get_my_profile RPC)
  const [affiliationInfo, setAffiliationInfo] = useState<{
    name: string;
    id: string | null;
    status: string;
    logo?: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Visitors, Likes & Availability modal states
  const [visitors, setVisitors] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [loadingLikers, setLoadingLikers] = useState(false);

  // 2. Derived variables (evaluated unconditionally)
  const firstName = personal?.firstName || "";
  const lastName = personal?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Not added";

  const roleLabel =
    personal?.professionalRole ||
    personal?.roleTitle ||
    personal?.role ||
    personal?.category ||
    personal?.professionalTitle ||
    "Operations Officer";

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
      ? licenses.map((l: any) => l.name || l.licenseName || l)
      : personal?.licenses && Array.isArray(personal.licenses)
      ? personal.licenses
      : personal?.licenseCertification
      ? [personal.licenseCertification]
      : [];
  const licensesList: string[] = rawLicenses.filter(Boolean);

  const workExperiences: any[] = Array.isArray(work) && work.length > 0
    ? work
    : Array.isArray(personal?.workExperiences)
    ? personal.workExperiences
    : [];

  const rawSkills =
    personal?.skills && Array.isArray(personal.skills)
      ? personal.skills
      : personal?.structuredSkills && Array.isArray(personal.structuredSkills)
      ? personal.structuredSkills.map((s: any) => s.name)
      : resume?.skills || [];
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean)
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

  // Dynamic Profile Completion Calculation (Single Source of Truth)
  const {
    areas: completionAreas,
    completedCount: completedAreasCount,
    totalCount: totalAreasCount,
    percentage: completionPercentage,
    missingAreas,
  } = computeProfileAreas({
    photo: profilePhoto,
    location: locationValue,
    work: workExperiences,
    languages: languagesList,
    skills: skillsList,
    licenses: licensesList,
  });

  // 3. All useEffect Hooks at the top of the component (Strictly before any early returns)
  useEffect(() => {
    // Force the page to always start from the top when mounting
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Ensure clean top position when loading transition finishes
    if (!loading) {
      window.scrollTo(0, 0);
    }
  }, [loading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("profile-progress-updated", { detail: completionPercentage })
      );
    }
  }, [completionPercentage]);

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const allPosts = await fetchPosts();
        if (session?.user) {
          setCurrentUserId(session.user.id);
          setUserPosts(allPosts.filter((p) => p.user_id === session.user.id));

          // Fetch user profile data from users, resumes, user_profiles, AND the official get_my_profile RPC
          const [userRes, resumeRes, userProfileRes, myProfileRes] = await Promise.allSettled([
            supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle(),
            supabase
              .from("resumes")
              .select("data")
              .eq("userId", session.user.id)
              .maybeSingle(),
            supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", session.user.id)
              .maybeSingle(),
            supabase.rpc("get_my_profile"),
          ]);

          const userData = userRes.status === "fulfilled" ? userRes.value.data : null;
          const resumeData = resumeRes.status === "fulfilled" ? resumeRes.value.data : null;
          const userProfileData = userProfileRes.status === "fulfilled" ? userProfileRes.value.data : null;
          const myProfileData = myProfileRes.status === "fulfilled" ? myProfileRes.value.data : null;

          console.log("[ProfilePage] Supabase users table record:", userData);
          console.log("[ProfilePage] Supabase resumes table data:", resumeData?.data);
          console.log("[ProfilePage] Supabase user_profiles record:", userProfileData);
          console.log("[ProfilePage] Supabase get_my_profile RPC:", myProfileData);

          const profileImage = userData?.profileImage || null;
          const crewData = (resumeData?.data as any) || null;

          const localPersonalRaw = localStorage.getItem("onboarding_personal");
          const localPersonal = localPersonalRaw ? JSON.parse(localPersonalRaw) : null;

          const dbAccountType = userData?.accountType || "";
          const authAccountType = session.user.user_metadata?.accountType || "";
          const localAccountType = localPersonal?.category || localPersonal?.role || "";

          let resolvedAccountType = "aviation_professional";
          if (authAccountType === "business" || dbAccountType === "business") {
            resolvedAccountType = "business";
          } else if (authAccountType === "flight_crew" || dbAccountType === "flight_crew" || localAccountType === "flight_crew") {
            resolvedAccountType = "flight_crew";
          } else {
            resolvedAccountType = "aviation_professional";
          }

          setAccountType(resolvedAccountType);
          setIsBusiness(resolvedAccountType === "business");

          setProfilePhoto(profileImage || localStorage.getItem("userProfilePhoto"));

          const coverImage =
            userData?.cover_image_url ||
            userData?.cover_photo_url ||
            userData?.coverImage ||
            userData?.coverPhoto ||
            userData?.cover_image ||
            userData?.cover_photo ||
            userData?.cover ||
            userData?.banner_url ||
            userData?.bannerImage ||
            userProfileData?.cover_photo_url ||
            userProfileData?.cover_image_url ||
            userProfileData?.coverImage ||
            userProfileData?.coverPhoto ||
            session.user.user_metadata?.cover_image_url ||
            session.user.user_metadata?.cover_photo_url ||
            session.user.user_metadata?.coverPhoto ||
            session.user.user_metadata?.coverImage ||
            crewData?.personal?.cover_image_url ||
            crewData?.personal?.cover_photo_url ||
            crewData?.personal?.coverPhoto ||
            crewData?.personal?.coverImage ||
            crewData?.coverPhoto ||
            crewData?.coverImage ||
            localPersonal?.cover_image_url ||
            localPersonal?.cover_photo_url ||
            localPersonal?.coverPhoto ||
            localPersonal?.coverImage ||
            (typeof window !== "undefined" ? localStorage.getItem("userCoverPhoto") : null) ||
            (typeof window !== "undefined" ? localStorage.getItem("userCoverImage") : null) ||
            null;

          console.log("[ProfilePage] Resolved coverPhoto URL:", coverImage);
          setCoverPhoto(coverImage);

          const savedLicenses = localStorage.getItem("onboarding_licenses");
          const savedRatings = localStorage.getItem("onboarding_ratings");
          const savedWork = localStorage.getItem("onboarding_work");
          const savedResume = localStorage.getItem("onboarding_resume");

          const localLicenses = savedLicenses ? JSON.parse(savedLicenses) : null;
          const localRatings = savedRatings ? JSON.parse(savedRatings) : null;
          const localWork = savedWork ? JSON.parse(savedWork) : null;
          const localResume = savedResume ? JSON.parse(savedResume) : null;

          const mergedPersonal = {
            ...(crewData?.personal || {}),
            ...(localPersonal || {}),
            firstName: userData?.firstName || localPersonal?.firstName || crewData?.personal?.firstName || "",
            lastName: userData?.lastName || localPersonal?.lastName || crewData?.personal?.lastName || "",
            email:
              userProfileData?.contactEmail ||
              myProfileData?.contactEmail ||
              crewData?.personal?.contactEmail ||
              localPersonal?.contactEmail ||
              localPersonal?.email ||
              crewData?.personal?.email ||
              userData?.email ||
              session.user.email ||
              "",
            phone:
              userProfileData?.contactPhone ||
              myProfileData?.contactPhone ||
              crewData?.personal?.contactPhone ||
              localPersonal?.contactPhone ||
              localPersonal?.phone ||
              crewData?.personal?.phone ||
              userData?.phone ||
              "",
            location: userData?.location || localPersonal?.location || crewData?.personal?.location || "",
            professionalRole: userData?.professionalRole || localPersonal?.professionalRole || localPersonal?.professionalRoleLabel || localPersonal?.professionalTitle || crewData?.personal?.professionalRole || "",
            role: userData?.role || localPersonal?.role || crewData?.personal?.role || "",
            availabilityStatus:
              userData?.availability_status ||
              localPersonal?.availabilityStatus ||
              crewData?.personal?.availabilityStatus ||
              "active",
          };

          setPersonal(mergedPersonal);

          let finalLicenses =
            crewData?.licenses && crewData.licenses.length > 0
              ? crewData.licenses
              : localLicenses || [];
              
          if (resolvedAccountType === "aviation_professional" && (myProfileData?.professionalCredentials || userProfileData?.professionalCredentials)) {
            const creds = myProfileData?.professionalCredentials || userProfileData?.professionalCredentials;
            if (Array.isArray(creds) && creds.length > 0) {
              finalLicenses = creds;
            }
          }
          setLicenses(finalLicenses);

          const finalRatings =
            crewData?.ratings && crewData.ratings.length > 0
              ? crewData.ratings
              : localRatings || [];
          setRatings(finalRatings);

          const finalWork = crewData?.work || localWork || mergedPersonal?.workExperiences || [];
          setWork(finalWork);

          const finalResume = crewData?.resume || localResume;
          if (finalResume) setResume(finalResume);

          const rawLanguages = mergedPersonal?.languages || finalResume?.languages || [];
          if (Array.isArray(rawLanguages)) {
            setLanguages(
              rawLanguages.map((l: any) => (typeof l === "string" ? l : l.name || l.label || String(l)))
            );
          }

          // E01-HU11: Read company affiliation using get_my_profile RPC
          try {
            const { data: profileRpc, error: profileRpcErr } = await supabase.rpc("get_my_profile");
            if (!profileRpcErr && profileRpc) {
              const aff =
                profileRpc.affiliation ||
                profileRpc.company_affiliation ||
                (Array.isArray(profileRpc.affiliations) ? profileRpc.affiliations[0] : null) ||
                (profileRpc.company_name || profileRpc.company ? profileRpc : null);

              const compName =
                aff?.company_name ||
                aff?.company?.name ||
                aff?.name ||
                profileRpc.company_name ||
                profileRpc.company?.name ||
                null;

              const compId =
                aff?.company_id ||
                aff?.company?.id ||
                aff?.id ||
                profileRpc.company_id ||
                null;

              const affStatus =
                aff?.status ||
                aff?.affiliation_status ||
                profileRpc.affiliation_status ||
                profileRpc.company_link_status ||
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
            console.warn("Could not load affiliation from get_my_profile:", rpcErr);
          }

          if (resolvedAccountType === "business") {
            const { data: companies } = await supabase
              .from("companies")
              .select("id, name, status, logo_url, location, contact_email, phone, website, description, founded_year, operating_areas, services, fleet_types")
              .eq("owner_user_id", session.user.id)
              .order("created_at", { ascending: false })
              .limit(1);

            if (companies && companies.length > 0) {
              const comp = companies[0] as any;
              
              let resolvedTypes: string[] = [];
              if (Array.isArray(comp.services) && comp.services.length > 0) {
                resolvedTypes = comp.services;
              }
              if (resolvedTypes.length === 0 && typeof window !== "undefined") {
                try {
                  const saved = localStorage.getItem("company_types_" + comp.id);
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) resolvedTypes = parsed;
                  }
                } catch (e) {}
              }
              if (resolvedTypes.length === 0) {
                try {
                  const { data: sel } = await supabase
                    .from("company_type_selections")
                    .select("company_type_id, company_types(label, name, key)")
                    .eq("company_id", comp.id);
                  if (sel && sel.length > 0) {
                    resolvedTypes = sel
                      .map((s: any) => s.company_types?.label || s.company_types?.name || s.company_types?.key)
                      .filter(Boolean);
                  }
                } catch (e) {}
              }
              if (resolvedTypes.length === 0) {
                resolvedTypes = ["Airline / Operator"];
              }

              setCompanyInfo({
                name: comp.name || "Company Name",
                status: comp.status,
                logo: comp.logo_url || profileImage,
                location: comp.location,
                email: comp.contact_email,
                phone: comp.phone,
                website: comp.website,
                description: comp.description,
                foundedYear: comp.founded_year,
                operatingAreas: comp.operating_areas || [],
                services: comp.services || [],
                fleetTypes: comp.fleet_types || [],
                types: resolvedTypes,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
                href="/onboarding?edit=true&step=2"
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
              href="/onboarding?edit=true&step=5&section=location"
              className="text-xs sm:text-sm text-gray-500 hover:text-[#1d4ed8] mt-1 inline-flex items-center justify-center gap-1 transition-colors group cursor-pointer"
              title="Edit Location"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
              <span className="group-hover:underline underline-offset-2">{locationValue}</span>
              <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-80 transition-opacity ml-0.5" />
            </Link>
          ) : (
            <Link
              href="/onboarding?edit=true&step=5&section=location"
              className="text-xs text-[#1d4ed8] hover:text-[#1e40af] font-semibold mt-1 inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Add location</span>
            </Link>
          )}

          {/* Status Pill Badge directly on page background */}
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

          {/* 3. Resumen Profesional Directo (Centrado, Gris Oscuro, Sin título "About Me") */}
          {summaryText && (
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal text-center max-w-sm sm:max-w-md mx-auto mt-4 px-1">
              {summaryText}
            </p>
          )}
        </div>

        {/* Main Content Cards Container */}
        <div className="w-full flex flex-col gap-4">

        {/* =========================================================================
            3. WIDGET DE COMPLETITUD DE PERFIL (Profile Completion)
            ========================================================================= */}
        {accountType !== "business" && completionPercentage < 100 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            
            {/* Header with Title, Subtitle, and Circular Percentage Indicator */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Complete your profile
                </h3>
                <span className="text-xs text-gray-500 font-medium mt-0.5">
                  {completedAreasCount} of {totalAreasCount} profile areas complete
                </span>
              </div>

              {/* Green Percentage Badge */}
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-emerald-50/50 flex items-center justify-center text-emerald-600 font-extrabold text-xs shrink-0 shadow-2xs">
                {completionPercentage}%
              </div>
            </div>

            {/* Action Items for Missing Fields */}
            <div className="flex flex-col gap-2.5 pt-1">
              {missingAreas.map((item) => (
                <Link
                  key={item.key}
                  href={`/onboarding?edit=true&step=${item.step || 5}`}
                  className="w-full text-left p-3.5 rounded-2xl bg-gray-50/80 hover:bg-blue-50/40 border border-gray-100 hover:border-blue-200 transition-all flex items-center justify-between gap-3 shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate font-medium">
                        {item.desc}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
                </Link>
              ))}
            </div>

          </div>
        )}

        {/* CARD: Company affiliation */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              Company affiliation
            </h2>
            <Link
              href="/business/affiliate"
              className="text-xs sm:text-sm font-bold text-[#1d4ed8] hover:text-[#1e40af] cursor-pointer"
            >
              {affiliationName ? "Edit" : "Link"}
            </Link>
          </div>

          <Link
            href="/business/affiliate"
            className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 flex items-center justify-between gap-3 shadow-2xs transition-all cursor-pointer group"
            title="Link your employer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#1d4ed8] group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] truncate transition-colors">
                  {affiliationName ? affiliationName : "Link your employer"}
                </span>
                <span className="text-xs text-gray-500 truncate font-medium">
                  {affiliationName ? (
                    isAffiliationPending ? (
                      <span className="text-amber-600 font-semibold">Pending Verification</span>
                    ) : isAffiliationVerified ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Company
                      </span>
                    ) : (
                      "Self-declared affiliation"
                    )
                  ) : (
                    "Associate your profile with your company or airline"
                  )}
                </span>
              </div>
            </div>

            <div className="p-2 text-gray-400 group-hover:text-[#1d4ed8] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* CARD: Professional details */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              Professional details
            </h2>
            <Link
              href="/onboarding?edit=true&step=5"
              className="text-xs sm:text-sm font-bold text-[#1d4ed8] hover:text-[#1e40af] cursor-pointer"
            >
              Edit all
            </Link>
          </div>

          <div className="divide-y divide-gray-100 space-y-4 pt-1">
            
            {/* Location: Interactive navigation shortcut */}
            <Link
              href="/onboarding?edit=true&step=5&section=location"
              className="pt-2 flex items-center justify-between group p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer"
              title="Edit Location"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider group-hover:text-[#1d4ed8] transition-colors">
                  Location
                </span>
                <p className={cn("text-sm font-semibold truncate", locationValue ? "text-gray-900" : "text-gray-400 font-normal")}>
                  {locationValue || "Add your location"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 text-gray-400 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-[#1d4ed8] flex items-center justify-center shrink-0 transition-all">
                {locationValue ? <ChevronRight className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
              </div>
            </Link>

            {/* Work experience: Interactive navigation shortcut */}
            <div className="pt-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Work experience
                </span>
                <Link
                  href="/onboarding?edit=true&step=5&section=work"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </Link>
              </div>
              {workExperiences.length > 0 ? (
                <div className="space-y-1.5">
                  {workExperiences.map((exp: any, idx: number) => (
                    <Link
                      key={exp.id || idx}
                      href="/onboarding?edit=true&step=5&section=work"
                      className="flex items-start justify-between p-2.5 -mx-2.5 rounded-2xl hover:bg-blue-50/40 border border-transparent hover:border-blue-100 transition-all cursor-pointer group"
                      title="Manage Work Experience"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Briefcase className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] shrink-0 mt-0.5 transition-colors" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors truncate">
                            {exp.roleTitle || exp.jobTitle || "Aviation Professional"}
                          </span>
                          <span className="text-xs text-gray-500 font-medium truncate">
                            {exp.companyName || exp.company} {exp.startDate ? `• ${exp.startDate} - ${exp.endDate || "Present"}` : ""}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] shrink-0 transition-colors mt-1" />
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href="/onboarding?edit=true&step=5&section=work"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <span className="text-sm text-gray-400 group-hover:text-gray-700 font-medium">No experience added</span>
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center transition-all">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </Link>
              )}
            </div>

            {/* Languages: Interactive navigation shortcut */}
            <div className="pt-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Languages
                </span>
                <Link
                  href="/onboarding?edit=true&step=5&section=languages"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </Link>
              </div>
              {languagesList.length > 0 ? (
                <Link
                  href="/onboarding?edit=true&step=5&section=languages"
                  className="flex flex-wrap gap-2 pt-0.5 p-2 -mx-2 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group"
                  title="Manage Languages"
                >
                  {languagesList.map((lang, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 group-hover:bg-blue-50 border border-gray-200/80 group-hover:border-blue-200 text-gray-800 group-hover:text-[#1d4ed8] rounded-full px-3 py-1 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      {lang}
                    </span>
                  ))}
                </Link>
              ) : (
                <Link
                  href="/onboarding?edit=true&step=5&section=languages"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <span className="text-sm text-gray-400 group-hover:text-gray-700 font-medium">No languages added</span>
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center transition-all">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* CARD: Skills: Interactive navigation shortcut */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              Skills & Expertise
            </h2>
            <Link
              href="/onboarding?edit=true&step=6"
              className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full border border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {skillsList.length > 0 ? (
                <>
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </>
              )}
            </Link>
          </div>

          {skillsList.length > 0 ? (
            <Link
              href="/onboarding?edit=true&step=6"
              className="flex flex-wrap gap-2 pt-1 p-2 -mx-2 rounded-2xl hover:bg-blue-50/40 transition-all cursor-pointer group"
              title="Manage Skills"
            >
              {skillsList.map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-gray-100 group-hover:bg-blue-50 border border-gray-200 group-hover:border-blue-200 text-gray-800 group-hover:text-[#1d4ed8] rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors"
                >
                  {skill}
                </span>
              ))}
            </Link>
          ) : (
            <Link
              href="/onboarding?edit=true&step=6"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">Select your skills</span>
                <span className="text-xs text-gray-400">Add key competencies and aviation specialties</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:bg-[#1d4ed8] group-hover:text-white flex items-center justify-center transition-all">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
            </Link>
          )}
        </div>

        {/* CARD: Contact & Credentials */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              Contact & Credentials
            </h2>
            <Link
              href="/onboarding?edit=true&step=4"
              className="text-xs sm:text-sm font-bold text-[#1d4ed8] hover:text-[#1e40af] cursor-pointer"
            >
              Edit
            </Link>
          </div>

          <div className="divide-y divide-gray-100 space-y-3.5 pt-1">
            
            {/* Phone */}
            <div className="pt-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Phone</span>
                <span className={cn("text-xs sm:text-sm font-semibold", phoneValue ? "text-[#1d4ed8]" : "text-gray-400 font-normal")}>
                  {phoneValue || "Not added"}
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="pt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Contact Email</span>
                <span className={cn("text-xs sm:text-sm font-semibold truncate", emailValue ? "text-[#1d4ed8]" : "text-gray-400 font-normal")}>
                  {emailValue || "Not added"}
                </span>
              </div>
            </div>

            {/* Licenses / Certifications */}
            <div className="pt-3.5 flex flex-col gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Licenses / Certifications
              </span>
              {licensesList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {licensesList.map((lic, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 border border-gray-200/90 text-gray-800 rounded-full px-3.5 py-1 text-xs font-semibold shadow-2xs"
                    >
                      {lic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-normal">Not added</p>
              )}
            </div>

          </div>
        </div>

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
