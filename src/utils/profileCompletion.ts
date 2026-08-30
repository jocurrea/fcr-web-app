import { supabase } from "@/lib/supabase";

/**
 * Standardized fixed percentage snaps.
 */
export const PERCENTAGE_MAP = [0, 17, 33, 50, 67, 83, 100] as const;

export type SnapPercentage = (typeof PERCENTAGE_MAP)[number] | number;

export interface CompletionArea {
  key: string;
  label: string;
  desc: string;
  isDone: boolean;
  step: number;
}

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  profileImage?: string | null;
  phone?: string;
  location?: string | { city?: string; country?: string } | null;
  cityCountry?: string;
  accountType?: string;
  category?: string;

  licenses?: string[] | Array<unknown>;
  licenseCertification?: string;

  certifications?: string[] | Array<unknown>;
  ratings?: string[] | Array<unknown>;

  workExperience?: Array<unknown>;
  work?: Array<unknown> | Record<string, unknown>;
  experiences?: Array<unknown>;
  education?: string | Array<unknown>;

  aboutMe?: string;
  description?: string;
  summary?: string;
  about?: string;
  resume?: { summary?: string; about?: string; [key: string]: any };

  skills?: string[] | Array<unknown>;
  structuredSkills?: Array<unknown>;
  career?: any;
  languages?: string[] | Array<unknown>;

  personal?: Partial<ProfileData>;
  user?: Partial<ProfileData>;
  [key: string]: any;
}

/**
 * Check if a given value is present and non-empty.
 */
export function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") {
    return Object.values(val as Record<string, unknown>).some((v) => hasValue(v));
  }
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return true;
  return false;
}

/**
 * Single source of truth for computing profile completion areas and percentage.
 */
export function computeProfileAreas(data: {
  photo?: string | null;
  location?: string | null;
  work?: any[] | null;
  languages?: any[] | null;
  skills?: any[] | null;
  licenses?: any[] | null;
}) {
  const areas: CompletionArea[] = [
    {
      key: "photo",
      label: "Profile photo",
      desc: "Upload a professional photo",
      isDone: Boolean(data.photo && typeof data.photo === "string" && data.photo.trim().length > 0),
      step: 2,
    },
    {
      key: "location",
      label: "Location",
      desc: "Add your city and country",
      isDone: Boolean(data.location && typeof data.location === "string" && data.location.trim().length > 0),
      step: 5,
    },
    {
      key: "work",
      label: "Work experience",
      desc: "Share your career background",
      isDone: Boolean(Array.isArray(data.work) && data.work.length > 0),
      step: 5,
    },
    {
      key: "languages",
      label: "Languages",
      desc: "Add the languages you speak",
      isDone: Boolean(Array.isArray(data.languages) && data.languages.length > 0),
      step: 5,
    },
    {
      key: "skills",
      label: "Skills",
      desc: "Highlight your aviation expertise",
      isDone: Boolean(Array.isArray(data.skills) && data.skills.length > 0),
      step: 6,
    },
    {
      key: "licenses",
      label: "Licenses / Certifications",
      desc: "Add professional credentials",
      isDone: Boolean(Array.isArray(data.licenses) && data.licenses.length > 0),
      step: 4,
    },
  ];

  const completedCount = areas.filter((a) => a.isDone).length;
  const totalCount = areas.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    areas,
    completedCount,
    totalCount,
    percentage,
    missingAreas: areas.filter((a) => !a.isDone),
  };
}

/**
 * Maps the number of completed sections to its corresponding snap percentage.
 */
export function mapSectionsToPercentage(sectionsCompleted: number): number {
  return Math.round((Math.max(0, Math.min(6, sectionsCompleted)) / 6) * 100);
}

/**
 * Evaluates completion percentage from in-memory ProfileData.
 */
export function calculateCompletionPercentage(profileData?: ProfileData | null): number {
  if (!profileData) return 0;

  const personal = profileData.personal || {};

  const photo = profileData.profileImage || profileData.avatar || personal.profileImage || personal.avatar || null;
  const location =
    (typeof profileData.location === "string" ? profileData.location : null) ||
    (typeof personal.location === "string" ? personal.location : null) ||
    profileData.cityCountry ||
    personal.cityCountry ||
    null;

  const work =
    (Array.isArray(profileData.workExperience) && profileData.workExperience) ||
    (Array.isArray(personal.workExperience) && personal.workExperience) ||
    (Array.isArray(profileData.work) && profileData.work) ||
    (Array.isArray(personal.work) && personal.work) ||
    (Array.isArray(personal.workExperiences) && personal.workExperiences) ||
    [];

  const languages =
    (Array.isArray(profileData.languages) && profileData.languages) ||
    (Array.isArray(personal.languages) && personal.languages) ||
    [];

  const skills =
    (Array.isArray(profileData.skills) && profileData.skills) ||
    (Array.isArray(personal.skills) && personal.skills) ||
    (Array.isArray(profileData.structuredSkills) && profileData.structuredSkills) ||
    [];

  const licenses =
    (Array.isArray(profileData.licenses) && profileData.licenses) ||
    (Array.isArray(personal.licenses) && personal.licenses) ||
    (profileData.licenseCertification ? [profileData.licenseCertification] : []) ||
    (personal.licenseCertification ? [personal.licenseCertification] : []) ||
    [];

  const result = computeProfileAreas({
    photo,
    location,
    work,
    languages,
    skills,
    licenses,
  });

  return result.percentage;
}

/**
 * Fetches profile records from users, resumes, and local storage
 * to compute the accurate real-time completion percentage.
 */
export async function fetchProfileProgress(userId: string): Promise<number> {
  let rData: any = null;
  let userRecord: any = null;

  try {
    const [resumeRes, userRes] = await Promise.allSettled([
      supabase.from("resumes").select("data").eq("userId", userId).maybeSingle(),
      supabase
        .from("users")
        .select("firstName, lastName, profileImage, phone, location, accountType")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    if (resumeRes.status === "fulfilled") rData = resumeRes.value.data?.data || null;
    if (userRes.status === "fulfilled") userRecord = userRes.value.data || null;
  } catch (e) {
    console.error("Error fetching data for profile progress:", e);
  }

  // Client-side local storage fallback
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
  const localWork = getLocal("onboarding_work");
  const localResume = getLocal("onboarding_resume");
  const savedPhoto = typeof window !== "undefined" ? localStorage.getItem("userProfilePhoto") : null;

  const photo = userRecord?.profileImage || savedPhoto || localPersonal?.profileImage || rData?.personal?.profilePhoto || null;
  const location = userRecord?.location || localPersonal?.location || rData?.personal?.location || null;

  const work =
    (Array.isArray(rData?.work) && rData.work.length > 0 ? rData.work : null) ||
    (Array.isArray(localWork) && localWork.length > 0 ? localWork : null) ||
    (Array.isArray(localPersonal?.workExperiences) && localPersonal.workExperiences.length > 0 ? localPersonal.workExperiences : null) ||
    [];

  const languages =
    (Array.isArray(rData?.languages) && rData.languages.length > 0 ? rData.languages : null) ||
    (Array.isArray(localPersonal?.languages) && localPersonal.languages.length > 0 ? localPersonal.languages : null) ||
    (Array.isArray(localResume?.languages) && localResume.languages.length > 0 ? localResume.languages : null) ||
    [];

  const skills =
    (Array.isArray(rData?.skills) && rData.skills.length > 0 ? rData.skills : null) ||
    (Array.isArray(localPersonal?.skills) && localPersonal.skills.length > 0 ? localPersonal.skills : null) ||
    (Array.isArray(localResume?.skills) && localResume.skills.length > 0 ? localResume.skills : null) ||
    [];

  const licenses =
    (Array.isArray(rData?.licenses) && rData.licenses.length > 0 ? rData.licenses : null) ||
    (Array.isArray(localLicenses) && localLicenses.length > 0 ? localLicenses : null) ||
    (Array.isArray(localPersonal?.licenses) && localPersonal.licenses.length > 0 ? localPersonal.licenses : null) ||
    (localPersonal?.licenseCertification ? [localPersonal.licenseCertification] : []) ||
    [];

  const result = computeProfileAreas({
    photo,
    location,
    work,
    languages,
    skills,
    licenses,
  });

  return result.percentage;
}
