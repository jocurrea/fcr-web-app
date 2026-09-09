import { supabase } from "@/lib/supabase";

/**
 * Standardized fixed percentage snaps matching mobile specification:
 * 0/6 => 0%
 * 1/6 => 15%
 * 2/6 => 30%
 * 3/6 => 50%
 * 4/6 => 70%
 * 5/6 => 85%
 * 6/6 => 100%
 */
export const PERCENTAGE_MAP = [0, 15, 30, 50, 70, 85, 100] as const;

export type SnapPercentage = (typeof PERCENTAGE_MAP)[number];

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

export interface ProfileAreasInput {
  photo?: string | null;
  name?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  ratings?: any[] | null;
  licenses?: any[] | null;
  qualifications?: any[] | null;
  flightHours?: string | number | null;
  summary?: string | null;
  role?: string | null;
  work?: any[] | null;
  skills?: any[] | null;
  languages?: any[] | null;
  affiliation?: any | null;
  companyName?: string | null;
  [key: string]: any;
}

/**
 * Single source of truth for computing the exact 6 core profile areas:
 * 1. Personal profile
 * 2. Licenses
 * 3. Aircraft ratings
 * 4. Work and qualifications
 * 5. Professional profile
 * 6. Career and skills
 */
export function computeProfileAreas(data: ProfileAreasInput) {
  // 1. Personal profile (photo or name+location or contact details)
  const hasPhoto = Boolean(data.photo && typeof data.photo === "string" && data.photo.trim().length > 0);
  const hasLocation = Boolean(data.location && typeof data.location === "string" && data.location.trim().length > 0);
  const hasName = Boolean(data.name && typeof data.name === "string" && data.name.trim().length > 0);
  const isPersonalDone = hasPhoto || (hasLocation && hasName) || Boolean(data.phone || data.email);

  // 2. Licenses (pilot/crew aviation licenses or credentials)
  const hasLicenses = Array.isArray(data.licenses) && data.licenses.length > 0;
  const isLicensesDone = hasLicenses;

  // 3. Aircraft ratings (type ratings / aircraft certificates)
  const hasRatings = Array.isArray(data.ratings) && data.ratings.length > 0;
  const isRatingsDone = hasRatings;

  // 4. Work and qualifications (experience, qualifications, or role details)
  const hasQualifications = Array.isArray(data.qualifications) && data.qualifications.length > 0;
  const isWorkQualificationsDone =
    hasQualifications ||
    (Array.isArray(data.work) && data.work.length > 0) ||
    Boolean(data.location && data.role);

  // 5. Professional profile (flight hours, professional summary, or role)
  const hasFlightHours = Boolean(
    data.flightHours &&
    String(data.flightHours).trim().length > 0 &&
    String(data.flightHours).trim() !== "0"
  );
  const hasSummary = Boolean(data.summary && typeof data.summary === "string" && data.summary.trim().length > 0);
  const hasRole = Boolean(data.role && typeof data.role === "string" && data.role.trim().length > 0);
  const isProfessionalDone = hasFlightHours || hasSummary || hasRole;

  // 6. Career and skills (work history, skills, languages)
  const hasWork = Array.isArray(data.work) && data.work.length > 0;
  const hasSkills = Array.isArray(data.skills) && data.skills.length > 0;
  const hasLanguages = Array.isArray(data.languages) && data.languages.length > 0;
  const isCareerSkillsDone = hasWork || hasSkills || hasLanguages;

  const areas: CompletionArea[] = [
    {
      key: "personal_profile",
      label: "Personal profile",
      desc: "Complete your identity, profile photo, nationality, date of birth, marital status, and children.",
      isDone: isPersonalDone,
      step: 1,
    },
    {
      key: "licenses",
      label: "Licenses",
      desc: "Add at least one license or certification.",
      isDone: isLicensesDone,
      step: 2,
    },
    {
      key: "aircraft_ratings",
      label: "Aircraft ratings",
      desc: "Add at least one aircraft type rating.",
      isDone: isRatingsDone,
      step: 3,
    },
    {
      key: "work_qualifications",
      label: "Work and qualifications",
      desc: "Complete your work location, experience, and role details.",
      isDone: isWorkQualificationsDone,
      step: 2,
    },
    {
      key: "professional_profile",
      label: "Professional profile",
      desc: "Complete your contact details, summary, and English proficiency.",
      isDone: isProfessionalDone,
      step: 1,
    },
    {
      key: "career_skills",
      label: "Career and skills",
      desc: "Add experience, training, languages, and at least one skill.",
      isDone: isCareerSkillsDone,
      step: 4,
    },
  ];

  const completedCount = areas.filter((a) => a.isDone).length;
  const totalCount = areas.length;
  const percentage = mapSectionsToPercentage(completedCount);

  return {
    areas,
    completedCount,
    totalCount,
    percentage,
    missingAreas: areas.filter((a) => !a.isDone),
  };
}

/**
 * Maps the number of completed sections to its corresponding snap percentage:
 * 0 => 0%, 1 => 15%, 2 => 30%, 3 => 50%, 4 => 70%, 5 => 85%, 6 => 100%
 */
export function mapSectionsToPercentage(sectionsCompleted: number): number {
  const index = Math.max(0, Math.min(6, Math.floor(sectionsCompleted)));
  return PERCENTAGE_MAP[index];
}

/**
 * Evaluates completion percentage from in-memory ProfileData.
 */
export function calculateCompletionPercentage(profileData?: ProfileData | null): number {
  if (!profileData) return 0;

  const personal = profileData.personal || {};

  const photo = profileData.profileImage || profileData.avatar || personal.profileImage || personal.avatar || null;
  const name = profileData.firstName || personal.firstName || [personal.firstName, personal.lastName].filter(Boolean).join(" ") || null;
  const location =
    (typeof profileData.location === "string" ? profileData.location : null) ||
    (typeof personal.location === "string" ? personal.location : null) ||
    profileData.cityCountry ||
    personal.cityCountry ||
    null;

  const phone = profileData.phone || personal.phone || null;
  const email = profileData.email || personal.email || null;

  const ratings =
    (Array.isArray(profileData.ratings) && profileData.ratings) ||
    (Array.isArray(personal.ratings) && personal.ratings) ||
    (Array.isArray(profileData.aircraftRatings) && profileData.aircraftRatings) ||
    [];

  const licenses =
    (Array.isArray(profileData.licenses) && profileData.licenses) ||
    (Array.isArray(personal.licenses) && personal.licenses) ||
    (profileData.licenseCertification ? [profileData.licenseCertification] : []) ||
    (personal.licenseCertification ? [personal.licenseCertification] : []) ||
    [];

  const qualifications =
    (Array.isArray(profileData.qualifications) && profileData.qualifications) ||
    (Array.isArray(profileData.certifications) && profileData.certifications) ||
    (Array.isArray(personal.qualifications) && personal.qualifications) ||
    (Array.isArray(personal.certifications) && personal.certifications) ||
    [];

  const flightHours =
    profileData.flightHours ||
    profileData.flight_hours ||
    profileData.totalFlightHours ||
    personal.flightHours ||
    personal.flight_hours ||
    personal.totalFlightHours ||
    null;

  const summary =
    profileData.aboutMe ||
    profileData.summary ||
    profileData.description ||
    personal.aboutMe ||
    personal.summary ||
    personal.description ||
    profileData.resume?.summary ||
    null;

  const role =
    profileData.role ||
    profileData.professionalRole ||
    personal.role ||
    personal.professionalRole ||
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

  const affiliation =
    profileData.affiliation ||
    profileData.company ||
    profileData.affiliationInfo ||
    personal.affiliation ||
    personal.company ||
    personal.companyName ||
    personal.linkedCompany ||
    null;

  const result = computeProfileAreas({
    photo,
    name,
    location,
    phone,
    email,
    ratings,
    licenses,
    qualifications,
    flightHours,
    summary,
    role,
    work,
    languages,
    skills,
    affiliation,
  });

  return result.percentage;
}

/**
 * Fetches profile records using the canonical get_my_profile() RPC,
 * users, user_profiles, resumes, and local storage fallback
 * to compute the accurate real-time completion percentage.
 */
export async function fetchProfileProgress(
  userId?: string,
  existingProfileRpcData?: any
): Promise<number> {
  let myProfileData: any = existingProfileRpcData || null;
  let rData: any = null;
  let userRecord: any = null;
  let userProfileRecord: any = null;

  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      effectiveUserId = session?.user?.id;
    }

    const [myProfileRes, resumeRes, userRes, userProfileRes] = await Promise.allSettled([
      !myProfileData ? Promise.resolve(supabase.rpc("get_my_profile")) : Promise.resolve({ data: myProfileData }),
      effectiveUserId ? Promise.resolve(supabase.from("resumes").select("data").eq("userId", effectiveUserId).maybeSingle()) : Promise.resolve({ data: null }),
      effectiveUserId
        ? Promise.resolve(
            supabase
              .from("users")
              .select("*")
              .eq("id", effectiveUserId)
              .maybeSingle()
          )
        : Promise.resolve({ data: null }),
      effectiveUserId
        ? Promise.resolve(
            supabase
              .from("user_profiles")
              .select("*")
              .eq("userId", effectiveUserId)
              .maybeSingle()
          )
        : Promise.resolve({ data: null }),
    ]);

    if (myProfileRes.status === "fulfilled" && myProfileRes.value?.data) {
      myProfileData = myProfileRes.value.data;
    }
    if (resumeRes.status === "fulfilled" && (resumeRes.value as any)?.data) {
      const rawResumeData = (resumeRes.value as any).data;
      rData = rawResumeData?.data || rawResumeData || null;
    }
    if (userRes.status === "fulfilled" && (userRes.value as any)?.data) {
      userRecord = (userRes.value as any).data || null;
    }
    if (userProfileRes.status === "fulfilled" && (userProfileRes.value as any)?.data) {
      userProfileRecord = (userProfileRes.value as any).data || null;
    }

    // Business accounts do not use profile completion percentages
    const accountType =
      userRecord?.accountType ||
      myProfileData?.account_type ||
      myProfileData?.accountType;
    if (accountType === "business") {
      return 0;
    }
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
  if (localPersonal?.category === "business" || localPersonal?.accountType === "business") {
    return 0;
  }
  const localLicenses = getLocal("onboarding_licenses");
  const localWork = getLocal("onboarding_work");
  const localResume = getLocal("onboarding_resume");
  const savedPhoto = typeof window !== "undefined" ? localStorage.getItem("userProfilePhoto") : null;

  const photo =
    myProfileData?.profile_image ||
    myProfileData?.profileImage ||
    myProfileData?.avatar ||
    myProfileData?.photo ||
    userRecord?.profileImage ||
    savedPhoto ||
    localPersonal?.profileImage ||
    rData?.personal?.profilePhoto ||
    rData?.profilePhoto ||
    null;

  const location =
    myProfileData?.location ||
    myProfileData?.city_country ||
    myProfileData?.cityCountry ||
    myProfileData?.work_country ||
    myProfileData?.nationality_country ||
    userProfileRecord?.location ||
    userProfileRecord?.city_country ||
    userProfileRecord?.cityCountry ||
    ([userProfileRecord?.locationCity, userProfileRecord?.locationCountry].filter(Boolean).join(", ") || null) ||
    userRecord?.location ||
    localPersonal?.location ||
    localPersonal?.cityCountry ||
    localPersonal?.city ||
    rData?.personal?.location ||
    rData?.personal?.cityCountry ||
    rData?.location ||
    null;

  const work =
    (Array.isArray(myProfileData?.workExperience) && myProfileData.workExperience.length > 0 ? myProfileData.workExperience : null) ||
    (Array.isArray(myProfileData?.work_experiences) && myProfileData.work_experiences.length > 0 ? myProfileData.work_experiences : null) ||
    (Array.isArray(myProfileData?.work) && myProfileData.work.length > 0 ? myProfileData.work : null) ||
    (Array.isArray(userProfileRecord?.professionalWorkExperiences) && userProfileRecord.professionalWorkExperiences.length > 0 ? userProfileRecord.professionalWorkExperiences : null) ||
    (Array.isArray(userProfileRecord?.workExperiences) && userProfileRecord.workExperiences.length > 0 ? userProfileRecord.workExperiences : null) ||
    (Array.isArray(rData?.work) && rData.work.length > 0 ? rData.work : null) ||
    (Array.isArray(localWork) && localWork.length > 0 ? localWork : null) ||
    (Array.isArray(localPersonal?.workExperiences) && localPersonal.workExperiences.length > 0 ? localPersonal.workExperiences : null) ||
    [];

  const languages =
    (Array.isArray(myProfileData?.spokenLanguages) && myProfileData.spokenLanguages.length > 0 ? myProfileData.spokenLanguages : null) ||
    (Array.isArray(myProfileData?.spoken_languages) && myProfileData.spoken_languages.length > 0 ? myProfileData.spoken_languages : null) ||
    (Array.isArray(myProfileData?.languages) && myProfileData.languages.length > 0 ? myProfileData.languages : null) ||
    (Array.isArray(myProfileData?.resume_languages) && myProfileData.resume_languages.length > 0 ? myProfileData.resume_languages : null) ||
    (Array.isArray(userProfileRecord?.spokenLanguages) && userProfileRecord.spokenLanguages.length > 0 ? userProfileRecord.spokenLanguages : null) ||
    (Array.isArray(rData?.languages) && rData.languages.length > 0 ? rData.languages : null) ||
    (Array.isArray(rData?.personal?.languages) && rData.personal.languages.length > 0 ? rData.personal.languages : null) ||
    (Array.isArray(localPersonal?.languages) && localPersonal.languages.length > 0 ? localPersonal.languages : null) ||
    (Array.isArray(localResume?.languages) && localResume.languages.length > 0 ? localResume.languages : null) ||
    [];

  const skills =
    (Array.isArray(myProfileData?.userSkills) && myProfileData.userSkills.length > 0 ? myProfileData.userSkills : null) ||
    (Array.isArray(myProfileData?.user_skills) && myProfileData.user_skills.length > 0 ? myProfileData.user_skills : null) ||
    (Array.isArray(myProfileData?.skills) && myProfileData.skills.length > 0 ? myProfileData.skills : null) ||
    (Array.isArray(userProfileRecord?.userSkills) && userProfileRecord.userSkills.length > 0 ? userProfileRecord.userSkills : null) ||
    (Array.isArray(rData?.skills) && rData.skills.length > 0 ? rData.skills : null) ||
    (Array.isArray(localPersonal?.skills) && localPersonal.skills.length > 0 ? localPersonal.skills : null) ||
    (Array.isArray(localPersonal?.structuredSkills) && localPersonal.structuredSkills.length > 0 ? localPersonal.structuredSkills : null) ||
    (Array.isArray(localResume?.skills) && localResume.skills.length > 0 ? localResume.skills : null) ||
    [];

  const licenses =
    (Array.isArray(myProfileData?.licenses) && myProfileData.licenses.length > 0 ? myProfileData.licenses : null) ||
    (Array.isArray(myProfileData?.professionalCredentials) && myProfileData.professionalCredentials.length > 0 ? myProfileData.professionalCredentials : null) ||
    (Array.isArray(myProfileData?.professional_credentials) && myProfileData.professional_credentials.length > 0 ? myProfileData.professional_credentials : null) ||
    (Array.isArray(myProfileData?.license_ids) && myProfileData.license_ids.length > 0 ? myProfileData.license_ids : null) ||
    (Array.isArray(myProfileData?.license_type_names) && myProfileData.license_type_names.length > 0 ? myProfileData.license_type_names : null) ||
    (Array.isArray(userProfileRecord?.professionalCredentials) && userProfileRecord.professionalCredentials.length > 0 ? userProfileRecord.professionalCredentials : null) ||
    (Array.isArray(rData?.licenses) && rData.licenses.length > 0 ? rData.licenses : null) ||
    (Array.isArray(rData?.personal?.licenses) && rData.personal.licenses.length > 0 ? rData.personal.licenses : null) ||
    (Array.isArray(localLicenses) && localLicenses.length > 0 ? localLicenses : null) ||
    (Array.isArray(localPersonal?.licenses) && localPersonal.licenses.length > 0 ? localPersonal.licenses : null) ||
    (localPersonal?.licenseCertification ? [localPersonal.licenseCertification] : []) ||
    (rData?.personal?.licenseCertification ? [rData.personal.licenseCertification] : []) ||
    [];

  const ratings =
    (Array.isArray(myProfileData?.ratings) && myProfileData.ratings.length > 0 ? myProfileData.ratings : null) ||
    (Array.isArray(rData?.ratings) && rData.ratings.length > 0 ? rData.ratings : null) ||
    (Array.isArray(localPersonal?.ratings) && localPersonal.ratings.length > 0 ? localPersonal.ratings : null) ||
    [];

  const flightHours =
    myProfileData?.flight_hours ||
    myProfileData?.flightHours ||
    rData?.personal?.totalFlightHours ||
    rData?.personal?.flightHours ||
    localPersonal?.totalFlightHours ||
    localPersonal?.flightHours ||
    null;

  const summary =
    myProfileData?.about_me ||
    myProfileData?.summary ||
    rData?.personal?.description ||
    rData?.resume?.summary ||
    localPersonal?.description ||
    localPersonal?.aboutMe ||
    localPersonal?.summary ||
    null;

  const role =
    userRecord?.professionalRole ||
    userRecord?.role ||
    localPersonal?.professionalRole ||
    localPersonal?.role ||
    null;

  const affiliation =
    myProfileData?.affiliation ||
    myProfileData?.company ||
    localPersonal?.companyName ||
    localPersonal?.linkedCompany ||
    null;

  const result = computeProfileAreas({
    photo,
    name: userRecord?.firstName || localPersonal?.firstName || null,
    location,
    phone: userProfileRecord?.contactPhone || localPersonal?.phone || null,
    email: userProfileRecord?.contactEmail || localPersonal?.email || null,
    ratings,
    licenses,
    qualifications: (Array.isArray(myProfileData?.qualifications) && myProfileData.qualifications.length > 0 ? myProfileData.qualifications : null) ||
      (Array.isArray(myProfileData?.certifications) && myProfileData.certifications.length > 0 ? myProfileData.certifications : null) ||
      [],
    flightHours,
    summary,
    role,
    work,
    languages,
    skills,
    affiliation,
  });

  return result.percentage;
}
