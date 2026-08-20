import { supabase } from '@/lib/supabase';
export { calculateCompletionPercentage } from '@/components/profile/profile-progress-widget';
export type { ProfileData } from '@/components/profile/profile-progress-widget';

/**
 * Six-section percentage map — matches mobile app utils/profileCompletion.js exactly.
 * Sections: Personal | Licenses | Aircraft Ratings | Work & Qualifications | Professional Profile | Career & Skills
 * Mapping: 0 sections = 0%, 1 = 15%, 2 = 30%, 3 = 50%, 4 = 70%, 5 = 85%, 6 = 100%
 */
const PERCENTAGE_MAP = [0, 15, 30, 50, 70, 85, 100];

function hasValue(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return true;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.values(val).some((v) => hasValue(v));
  return false;
}

export function calculateCompletionPercentageFromSections(sectionsCompleted: number): number {
  const index = Math.max(0, Math.min(6, sectionsCompleted));
  return PERCENTAGE_MAP[index];
}

export async function fetchProfileProgress(userId: string): Promise<number> {
  let rData: any = null;
  let userRecord: any = null;
  let userProfile: any = null;

  try {
    const [resumeRes, userRes, userProfileRes] = await Promise.allSettled([
      supabase.from('resumes').select('data').eq('userId', userId).maybeSingle(),
      supabase.from('users').select('firstName, lastName, profileImage, position, phone, location').eq('id', userId).maybeSingle(),
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (resumeRes.status === 'fulfilled') rData = resumeRes.value.data?.data || null;
    if (userRes.status === 'fulfilled') userRecord = userRes.value.data || null;
    if (userProfileRes.status === 'fulfilled') userProfile = userProfileRes.value.data || null;
  } catch (e) {
    console.error("Error fetching data for profile progress:", e);
  }

  // localStorage fallback (client-side only)
  const getLocal = (key: string) => {
    try {
      const item = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const localPersonal   = getLocal("onboarding_personal");
  const localLicenses   = getLocal("onboarding_licenses");
  const localRatings    = getLocal("onboarding_ratings");
  const localWork       = getLocal("onboarding_work");
  const localResume     = getLocal("onboarding_resume");

  /**
   * SECTION 1 — Personal Profile
   * Checks: users.firstName + lastName, or resumes.data.personal, or user_profiles fields, or localStorage
   */
  const hasPersonal =
    (hasValue(userRecord?.firstName) && hasValue(userRecord?.lastName)) ||
    hasValue(userProfile?.bio) ||
    hasValue(rData?.personal?.firstName) ||
    hasValue(localPersonal?.firstName);

  /**
   * SECTION 2 — Licenses
   * Checks: resumes.data.licenses (array with items), or localStorage
   */
  const hasLicenses =
    (Array.isArray(rData?.licenses) && rData.licenses.length > 0) ||
    (Array.isArray(localLicenses) && localLicenses.length > 0);

  /**
   * SECTION 3 — Aircraft Ratings
   * Checks: resumes.data.ratings (array with items), or localStorage
   */
  const hasRatings =
    (Array.isArray(rData?.ratings) && rData.ratings.length > 0) ||
    (Array.isArray(localRatings) && localRatings.length > 0);

  /**
   * SECTION 4 — Work and Qualifications
   * Checks: resumes.data.work object, or experiences, or localStorage
   */
  const hasWork =
    hasValue(rData?.work) ||
    (Array.isArray(rData?.experiences) && rData.experiences.length > 0) ||
    hasValue(localWork);

  /**
   * SECTION 5 — Professional Profile
   * Checks: resumes.data.resume (summary/about text), user_profiles.bio, or localStorage
   */
  const hasProfessional =
    hasValue(rData?.resume?.summary) ||
    hasValue(rData?.resume?.about) ||
    hasValue(rData?.summary) ||
    hasValue(rData?.about) ||
    hasValue(userProfile?.bio) ||
    hasValue(localResume?.summary) ||
    hasValue(localResume?.about) ||
    (localResume !== null && hasValue(localResume));

  /**
   * SECTION 6 — Career and Skills
   * Checks: resumes.data.skills array, career field, or localStorage
   */
  const hasSkills =
    (Array.isArray(rData?.skills) && rData.skills.length > 0) ||
    hasValue(rData?.career) ||
    (Array.isArray(localResume?.skills) && localResume.skills.length > 0);

  let completedCount = 0;
  if (hasPersonal)     completedCount++;
  if (hasLicenses)     completedCount++;
  if (hasRatings)      completedCount++;
  if (hasWork)         completedCount++;
  if (hasProfessional) completedCount++;
  if (hasSkills)       completedCount++;

  return calculateCompletionPercentageFromSections(completedCount);
}
