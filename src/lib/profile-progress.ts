import { supabase } from '@/lib/supabase';

const PERCENTAGE_MAP = [0, 15, 30, 50, 70, 85, 100];

function hasValue(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') {
    return Object.values(val).some((v) => hasValue(v));
  }
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return true;
  return false;
}

export function calculateCompletionPercentageFromSections(sectionsCompleted: number): number {
  const index = Math.max(0, Math.min(6, sectionsCompleted));
  return PERCENTAGE_MAP[index];
}

export async function fetchProfileProgress(userId: string): Promise<number> {
  let rData: any = null;
  let userRecord: any = null;

  try {
    const [{ data: resumeRes }, { data: userRes }] = await Promise.all([
      supabase.from('resumes').select('data').eq('userId', userId).maybeSingle(),
      supabase.from('users').select('firstName, lastName, profileImage, position').eq('id', userId).maybeSingle()
    ]);
    rData = resumeRes?.data || null;
    userRecord = userRes || null;
  } catch (e) {
    console.error("Error fetching data for profile progress:", e);
  }

  // Helper for localStorage fallback
  const getLocal = (key: string) => {
    try {
      const item = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
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

  // 1. Personal profile
  const hasPersonal =
    hasValue(rData?.personal) ||
    hasValue(localPersonal) ||
    (hasValue(userRecord?.firstName) && hasValue(userRecord?.lastName));

  // 2. Licenses
  const hasLicenses =
    hasValue(rData?.licenses) ||
    hasValue(localLicenses);

  // 3. Aircraft ratings
  const hasRatings =
    hasValue(rData?.ratings) ||
    hasValue(localRatings);

  // 4. Work and qualifications
  const hasWork =
    hasValue(rData?.work) ||
    hasValue(rData?.experiences) ||
    hasValue(localWork);

  // 5. Professional profile
  const hasProfessional =
    hasValue(rData?.resume) ||
    hasValue(rData?.summary) ||
    hasValue(rData?.about) ||
    hasValue(localResume?.summary) ||
    hasValue(localResume?.about) ||
    hasValue(localResume);

  // 6. Career and skills
  const hasSkills =
    hasValue(rData?.skills) ||
    hasValue(rData?.career) ||
    hasValue(localResume?.skills);

  let completedCount = 0;
  if (hasPersonal) completedCount++;
  if (hasLicenses) completedCount++;
  if (hasRatings) completedCount++;
  if (hasWork) completedCount++;
  if (hasProfessional) completedCount++;
  if (hasSkills) completedCount++;

  return calculateCompletionPercentageFromSections(completedCount);
}

