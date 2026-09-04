"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { computeProfileAreas, fetchProfileProgress } from "@/utils/profileCompletion";

export interface CompanyInfo {
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
}

export interface AffiliationInfo {
  name: string;
  id: string | null;
  status: string;
  logo?: string | null;
}

export interface UserProfileContextValue {
  profileProgress: number;
  profilePhoto: string | null;
  coverPhoto: string | null;
  profileData: any | null;
  personal: any | null;
  licenses: any[];
  ratings: any[];
  work: any[];
  languages: string[];
  skills: string[];
  resume: any | null;
  accountType: string | null;
  isBusiness: boolean;
  companyInfo: CompanyInfo | null;
  affiliationInfo: AffiliationInfo | null;
  companyStatus: string;
  userStatus: string;
  onboarded: boolean;
  completionAreas: any[];
  completedCount: number;
  totalCount: number;
  missingAreas: any[];
  isLoading: boolean;
  refetchProfile: () => Promise<number>;
  setProfileProgress: (progress: number) => void;
  updateProfileData: (data: any, computedProgress?: number) => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profileProgress: 0,
  profilePhoto: null,
  coverPhoto: null,
  profileData: null,
  personal: null,
  licenses: [],
  ratings: [],
  work: [],
  languages: [],
  skills: [],
  resume: null,
  accountType: null,
  isBusiness: false,
  companyInfo: null,
  affiliationInfo: null,
  companyStatus: "pending",
  userStatus: "active",
  onboarded: false,
  completionAreas: [],
  completedCount: 0,
  totalCount: 6,
  missingAreas: [],
  isLoading: true,
  refetchProfile: async () => 0,
  setProfileProgress: () => {},
  updateProfileData: () => {},
});

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profileProgress, setProfileProgressState] = useState<number>(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [personal, setPersonal] = useState<any | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [work, setWork] = useState<any[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [resume, setResume] = useState<any | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [affiliationInfo, setAffiliationInfo] = useState<AffiliationInfo | null>(null);
  const [companyStatus, setCompanyStatus] = useState<string>("pending");
  const [userStatus, setUserStatus] = useState<string>("active");
  const [onboarded, setOnboarded] = useState<boolean>(false);
  const [completionAreas, setCompletionAreas] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(6);
  const [missingAreas, setMissingAreas] = useState<any[]>([]);

  const [accountType, setAccountType] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("account_type") || localStorage.getItem("accountType");
      if (saved) return saved;
      try {
        const p = localStorage.getItem("onboarding_personal");
        if (p) {
          const parsed = JSON.parse(p);
          if (parsed.category === "business" || parsed.accountType === "business") {
            return "business";
          }
        }
      } catch {}
    }
    return null;
  });

  const [isBusiness, setIsBusiness] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("account_type") || localStorage.getItem("accountType");
      return saved === "business";
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const fetchingRef = useRef<boolean>(false);

  const setProfileProgress = useCallback((progress: number) => {
    setProfileProgressState(progress);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("profile-progress-updated", { detail: progress })
      );
    }
  }, []);

  const updateProfileData = useCallback(
    (data: any, computedProgress?: number) => {
      if (data) {
        setProfileData(data);
      }
      if (typeof computedProgress === "number") {
        setProfileProgressState(computedProgress);
      }
    },
    []
  );

  const refetchProfile = useCallback(async (): Promise<number> => {
    try {
      fetchingRef.current = true;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsLoading(false);
        fetchingRef.current = false;
        return 0;
      }

      const userId = session.user.id;

      // 1. Unified parallel fetch for canonical get_my_profile() RPC, users, resumes, user_profiles, companies
      const [myProfileRes, userRes, resumeRes, userProfileRes, companyRes] =
        await Promise.allSettled([
          supabase.rpc("get_my_profile"),
          supabase.from("users").select("*").eq("id", userId).maybeSingle(),
          supabase.from("resumes").select("data").eq("userId", userId).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("userId", userId).maybeSingle(),
          supabase
            .from("companies")
            .select(
              "id, name, status, logo_url, location, contact_email, phone, website, description, founded_year, operating_areas, services, fleet_types"
            )
            .eq("owner_user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

      const myProfileData =
        myProfileRes.status === "fulfilled" ? myProfileRes.value?.data : null;
      const userData =
        userRes.status === "fulfilled" ? (userRes.value as any)?.data : null;
      const rawResumeData =
        resumeRes.status === "fulfilled" ? (resumeRes.value as any)?.data : null;
      const crewData = rawResumeData?.data || rawResumeData || null;
      const userProfileData =
        userProfileRes.status === "fulfilled"
          ? (userProfileRes.value as any)?.data
          : null;
      const companies =
        companyRes.status === "fulfilled"
          ? (companyRes.value as any)?.data
          : null;

      if (myProfileData) {
        setProfileData(myProfileData);
      }

      // 2. Client-side local storage fallback
      const getLocal = (key: string) => {
        try {
          const item = typeof window !== "undefined" ? localStorage.getItem(key) : null;
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      };

      const localPersonal = getLocal("onboarding_personal");
      const localLicenses = getLocal("onboarding_licenses");
      const localRatings = getLocal("onboarding_ratings");
      const localWork = getLocal("onboarding_work");
      const localResume = getLocal("onboarding_resume");
      const savedPhoto =
        typeof window !== "undefined" ? localStorage.getItem("userProfilePhoto") : null;
      const savedCover =
        typeof window !== "undefined"
          ? localStorage.getItem("userCoverPhoto") || localStorage.getItem("userCoverImage")
          : null;

      // 3. Resolve accountType
      const dbAccountType = userData?.accountType || "";
      const authAccountType = session.user.user_metadata?.accountType || "";
      const localAccountType =
        localPersonal?.category || localPersonal?.role || localPersonal?.accountType || "";

      let resolvedAccountType = "aviation_professional";
      if (
        authAccountType === "business" ||
        dbAccountType === "business" ||
        localAccountType === "business"
      ) {
        resolvedAccountType = "business";
      } else if (
        authAccountType === "flight_crew" ||
        dbAccountType === "flight_crew" ||
        localAccountType === "flight_crew"
      ) {
        resolvedAccountType = "flight_crew";
      } else {
        resolvedAccountType = "aviation_professional";
      }

      const businessFlag = resolvedAccountType === "business";
      setAccountType(resolvedAccountType);
      setIsBusiness(businessFlag);
      if (typeof window !== "undefined") {
        localStorage.setItem("account_type", resolvedAccountType);
      }

      // 4. Resolve onboarding & user status
      const isUserApproved =
        userData?.approvalStatus === "approved" ||
        userData?.availability_status === "active" ||
        localPersonal?.approvalStatus === "approved" ||
        localPersonal?.status === "active" ||
        true;
      setUserStatus(isUserApproved ? "active" : "pending");

      const hasOnboardedSignal =
        Boolean(userData?.onboarded) ||
        (typeof document !== "undefined" &&
          document.cookie.includes("flightcrew_onboarded=true")) ||
        (typeof window !== "undefined" &&
          (sessionStorage.getItem("flightcrew_onboarded") === "true" ||
            localStorage.getItem("flightcrew_onboarded") === "true")) ||
        Boolean(session.user.user_metadata?.onboarded);

      setOnboarded(hasOnboardedSignal);

      // 5. Build canonical merged personal info
      const mergedPersonal = {
        ...(crewData?.personal || {}),
        ...(localPersonal || {}),
        firstName:
          userData?.firstName ||
          localPersonal?.firstName ||
          crewData?.personal?.firstName ||
          "",
        lastName:
          userData?.lastName ||
          localPersonal?.lastName ||
          crewData?.personal?.lastName ||
          "",
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
        location:
          myProfileData?.location ||
          myProfileData?.city_country ||
          myProfileData?.cityCountry ||
          myProfileData?.work_country ||
          userProfileData?.location ||
          userProfileData?.city_country ||
          userProfileData?.cityCountry ||
          ([userProfileData?.locationCity, userProfileData?.locationCountry]
            .filter(Boolean)
            .join(", ") || null) ||
          userData?.location ||
          localPersonal?.location ||
          localPersonal?.cityCountry ||
          crewData?.personal?.location ||
          "",
        professionalRole:
          userData?.professionalRole ||
          localPersonal?.professionalRole ||
          localPersonal?.professionalRoleLabel ||
          localPersonal?.professionalTitle ||
          crewData?.personal?.professionalRole ||
          "",
        role: userData?.role || localPersonal?.role || crewData?.personal?.role || "",
        availabilityStatus:
          userProfileData?.workAvailabilityStatus ||
          userData?.availability_status ||
          localPersonal?.availabilityStatus ||
          crewData?.personal?.availabilityStatus ||
          "active",
      };
      setPersonal(mergedPersonal);

      // 6. Build final licenses / credentials list
      let resolvedLicenses =
        crewData?.licenses && crewData.licenses.length > 0
          ? crewData.licenses
          : localLicenses || [];

      if (
        Array.isArray(userProfileData?.professionalCredentials) &&
        userProfileData.professionalCredentials.length > 0
      ) {
        resolvedLicenses = userProfileData.professionalCredentials;
      } else if (
        Array.isArray(myProfileData?.professionalCredentials) &&
        myProfileData.professionalCredentials.length > 0
      ) {
        resolvedLicenses = myProfileData.professionalCredentials;
      } else if (
        Array.isArray(myProfileData?.professional_credentials) &&
        myProfileData.professional_credentials.length > 0
      ) {
        resolvedLicenses = myProfileData.professional_credentials;
      } else if (
        Array.isArray(mergedPersonal?.licenses) &&
        mergedPersonal.licenses.length > 0
      ) {
        resolvedLicenses = mergedPersonal.licenses;
      } else if (mergedPersonal?.licenseCertification) {
        resolvedLicenses = [mergedPersonal.licenseCertification];
      }
      setLicenses(resolvedLicenses);

      // 7. Build final ratings list
      const resolvedRatings =
        crewData?.ratings && crewData.ratings.length > 0
          ? crewData.ratings
          : localRatings || [];
      setRatings(resolvedRatings);

      // 8. Build final work experiences list
      const resolvedWork =
        (Array.isArray(userProfileData?.professionalWorkExperiences) &&
        userProfileData.professionalWorkExperiences.length > 0
          ? userProfileData.professionalWorkExperiences
          : null) ||
        (Array.isArray(userProfileData?.workExperiences) &&
        userProfileData.workExperiences.length > 0
          ? userProfileData.workExperiences
          : null) ||
        (Array.isArray(crewData?.work) && crewData.work.length > 0
          ? crewData.work
          : null) ||
        (Array.isArray(localWork) && localWork.length > 0 ? localWork : null) ||
        (Array.isArray(mergedPersonal?.workExperiences) &&
        mergedPersonal.workExperiences.length > 0
          ? mergedPersonal.workExperiences
          : null) ||
        [];
      setWork(resolvedWork);

      // 9. Build final resume & languages & skills
      const resolvedResume = crewData?.resume || localResume || null;
      setResume(resolvedResume);

      const rawLanguages =
        (Array.isArray(userProfileData?.spokenLanguages) &&
        userProfileData.spokenLanguages.length > 0
          ? userProfileData.spokenLanguages
          : null) ||
        (Array.isArray(mergedPersonal?.languages) && mergedPersonal.languages.length > 0
          ? mergedPersonal.languages
          : null) ||
        (Array.isArray(resolvedResume?.languages) && resolvedResume.languages.length > 0
          ? resolvedResume.languages
          : null) ||
        (Array.isArray(localPersonal?.languages) && localPersonal.languages.length > 0
          ? localPersonal.languages
          : null) ||
        [];
      const resolvedLanguages = rawLanguages.map((l: any) =>
        typeof l === "string" ? l : l.name || l.label || String(l)
      );
      setLanguages(resolvedLanguages);

      const rawSkills =
        (Array.isArray(userProfileData?.userSkills) && userProfileData.userSkills.length > 0
          ? userProfileData.userSkills
          : null) ||
        (Array.isArray(mergedPersonal?.skills) && mergedPersonal.skills.length > 0
          ? mergedPersonal.skills
          : null) ||
        (Array.isArray(mergedPersonal?.structuredSkills) &&
        mergedPersonal.structuredSkills.length > 0
          ? mergedPersonal.structuredSkills.map((s: any) => s.name || s)
          : null) ||
        (Array.isArray(resolvedResume?.skills) && resolvedResume.skills.length > 0
          ? resolvedResume.skills
          : null) ||
        (Array.isArray(localPersonal?.skills) && localPersonal.skills.length > 0
          ? localPersonal.skills
          : null) ||
        [];
      const resolvedSkills = rawSkills
        .map((s: any) => (typeof s === "string" ? s : s.name || s.label))
        .filter(Boolean);
      setSkills(resolvedSkills);

      // 10. Resolve affiliation info (E01-HU11)
      if (myProfileData) {
        const aff =
          myProfileData.affiliation ||
          myProfileData.company_affiliation ||
          (Array.isArray(myProfileData.affiliations) ? myProfileData.affiliations[0] : null) ||
          (myProfileData.company_name || myProfileData.company ? myProfileData : null);

        const compName =
          aff?.company_name ||
          aff?.company?.name ||
          aff?.name ||
          myProfileData.company_name ||
          myProfileData.company?.name ||
          null;

        const compId =
          aff?.company_id ||
          aff?.company?.id ||
          aff?.id ||
          myProfileData.company_id ||
          null;

        const affStatus =
          aff?.status ||
          aff?.affiliation_status ||
          myProfileData.affiliation_status ||
          myProfileData.company_link_status ||
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

      // 11. Resolve Business Company Info if applicable
      let companyLogo: string | null = null;
      if (businessFlag && companies && companies.length > 0) {
        const comp = companies[0] as any;
        setCompanyStatus(comp.status || "pending");
        companyLogo = comp.logo_url || null;

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
          resolvedTypes = ["Airline / Operator"];
        }

        setCompanyInfo({
          name: comp.name || "Company Name",
          status: comp.status,
          logo: comp.logo_url || userData?.profileImage || null,
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

      // 12. Resolve profilePhoto and coverPhoto
      const resolvedPhoto =
        companyLogo ||
        userData?.profileImage ||
        myProfileData?.profile_image ||
        myProfileData?.profileImage ||
        myProfileData?.avatar ||
        myProfileData?.photo ||
        savedPhoto ||
        localPersonal?.profileImage ||
        crewData?.personal?.profilePhoto ||
        null;
      setProfilePhoto(resolvedPhoto);

      const resolvedCover =
        userData?.cover_image_url ||
        userData?.cover_photo_url ||
        userData?.coverImage ||
        userData?.coverPhoto ||
        userProfileData?.cover_photo_url ||
        userProfileData?.cover_image_url ||
        crewData?.personal?.cover_photo_url ||
        crewData?.personal?.coverPhoto ||
        savedCover ||
        null;
      setCoverPhoto(resolvedCover);

      // 13. Canonical Profile Completion Calculation (Single Source of Truth)
      let progress = 0;
      if (!businessFlag) {
        const licensesList = resolvedLicenses
          .map((l: any) => l?.name || l?.licenseName || l)
          .filter(Boolean);

        const calculation = computeProfileAreas({
          photo: resolvedPhoto,
          location: mergedPersonal?.location || null,
          work: resolvedWork,
          languages: resolvedLanguages,
          skills: resolvedSkills,
          licenses: licensesList,
        });

        progress = calculation.percentage;
        setCompletionAreas(calculation.areas);
        setCompletedCount(calculation.completedCount);
        setTotalCount(calculation.totalCount);
        setMissingAreas(calculation.missingAreas);
      } else {
        progress = 0;
        setCompletionAreas([]);
        setCompletedCount(0);
        setMissingAreas([]);
      }

      setProfileProgressState(progress);

      // Broadcast event for any legacy listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-progress-updated", { detail: progress })
        );
      }

      setIsLoading(false);
      fetchingRef.current = false;
      return progress;
    } catch (err) {
      console.error("[UserProfileProvider] Error refetching profile:", err);
      setIsLoading(false);
      fetchingRef.current = false;
      return 0;
    }
  }, []);

  useEffect(() => {
    refetchProfile();

    function handleProgressUpdate(e: any) {
      if (typeof e.detail === "number") {
        setProfileProgressState(e.detail);
      } else {
        refetchProfile();
      }
    }

    function handleProfileMutation() {
      refetchProfile();
    }

    window.addEventListener("profile-progress-updated", handleProgressUpdate);
    window.addEventListener("profile-updated", handleProfileMutation);

    return () => {
      window.removeEventListener("profile-progress-updated", handleProgressUpdate);
      window.removeEventListener("profile-updated", handleProfileMutation);
    };
  }, [refetchProfile]);

  return (
    <UserProfileContext.Provider
      value={{
        profileProgress,
        profilePhoto,
        coverPhoto,
        profileData,
        personal,
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
        companyStatus,
        userStatus,
        onboarded,
        completionAreas,
        completedCount,
        totalCount,
        missingAreas,
        isLoading,
        refetchProfile,
        setProfileProgress,
        updateProfileData,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
