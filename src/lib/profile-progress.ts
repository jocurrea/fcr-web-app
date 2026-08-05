import { supabase } from '@/lib/supabase';

export async function fetchProfileProgress(userId: string): Promise<number> {
  const hasValue = (val: any) => {
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return true;
  };

  try {
    const { data: resumeRes } = await supabase
      .from('resumes')
      .select('data')
      .eq('userId', userId)
      .maybeSingle();

    if (resumeRes?.data) {
      const rData = resumeRes.data as any;
      let currentProgress = 30;
      if (hasValue(rData.personal)) currentProgress += 15;
      if (hasValue(rData.licenses)) currentProgress += 15;
      if (hasValue(rData.ratings)) currentProgress += 15;
      if (hasValue(rData.work)) currentProgress += 10;
      if (hasValue(rData.resume)) currentProgress += 15;
      return Math.min(currentProgress, 100);
    }
  } catch (e) {
    console.error("Error fetching resume for profile progress:", e);
  }

  let localProg = 30;
  try {
    const getLocal = (key: string) => {
      const item = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : null;
    };
    if (hasValue(getLocal("onboarding_personal"))) localProg += 15;
    if (hasValue(getLocal("onboarding_licenses"))) localProg += 15;
    if (hasValue(getLocal("onboarding_ratings"))) localProg += 15;
    if (hasValue(getLocal("onboarding_work"))) localProg += 10;
    if (hasValue(getLocal("onboarding_resume"))) localProg += 15;
  } catch (e) {
    console.error("Error parsing local storage for progress", e);
  }
  return Math.min(localProg, 100);
}
