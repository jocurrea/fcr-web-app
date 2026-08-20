"use client";

import React, { useMemo } from "react";

export interface ProfileData {
  // Section 1: Personal Profile
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  profileImage?: string | null;
  phone?: string;
  location?: string | { city?: string; country?: string } | null;
  cityCountry?: string;

  // Section 2: Licenses
  licenses?: string[] | Array<unknown>;
  licenseCertification?: string;

  // Section 3: Aircraft Ratings
  certifications?: string[] | Array<unknown>;
  ratings?: string[] | Array<unknown>;

  // Section 4: Work and Qualifications
  workExperience?: Array<unknown>;
  work?: Array<unknown> | Record<string, unknown>;
  experiences?: Array<unknown>;

  // Section 5: Professional Profile
  aboutMe?: string;
  description?: string;
  summary?: string;
  about?: string;
  resume?: { summary?: string; about?: string; [key: string]: any };

  // Section 6: Career and Skills
  skills?: string[] | Array<unknown>;
  structuredSkills?: Array<unknown>;
  career?: any;
  languages?: string[] | Array<unknown>;

  // Nested structures support
  personal?: Partial<ProfileData>;
  user?: Partial<ProfileData>;
  [key: string]: any;
}

export interface ProfileProgressWidgetProps {
  profileData?: ProfileData | null;
  className?: string;
}

/**
 * Six-section percentage map — matches mobile app utils/profileCompletion.js exactly.
 * 0 sections = 0%, 1 = 15%, 2 = 30%, 3 = 50%, 4 = 70%, 5 = 85%, 6 = 100%
 */
const PERCENTAGE_MAP = [0, 15, 30, 50, 70, 85, 100];

/**
 * Checks if a value is meaningfully filled/present.
 */
function hasValue(val: unknown): boolean {
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
 * Evaluates profile data across the same 6 sections as the mobile app.
 *
 * Mobile app section mapping:
 *   1. Personal Profile     → 15%
 *   2. Licenses             → 30%
 *   3. Aircraft Ratings     → 50%
 *   4. Work & Qualifications→ 70%
 *   5. Professional Profile → 85%
 *   6. Career & Skills      → 100%
 */
export function calculateCompletionPercentage(profileData?: ProfileData | null): number {
  if (!profileData) return 0;

  const personal = profileData.personal || {};
  const user = profileData.user || {};

  // Section 1 — Personal Profile
  const hasPersonal =
    (hasValue(profileData.firstName) || hasValue(personal.firstName) || hasValue(user.firstName)) &&
    (hasValue(profileData.lastName) || hasValue(personal.lastName) || hasValue(user.lastName));

  // Section 2 — Licenses
  const hasLicenses =
    (Array.isArray(profileData.licenses) && profileData.licenses.length > 0) ||
    (Array.isArray(personal.licenses) && (personal.licenses as unknown[]).length > 0) ||
    hasValue(profileData.licenseCertification) ||
    hasValue(personal.licenseCertification);

  // Section 3 — Aircraft Ratings
  const hasRatings =
    (Array.isArray(profileData.certifications) && profileData.certifications.length > 0) ||
    (Array.isArray(personal.certifications) && (personal.certifications as unknown[]).length > 0) ||
    (Array.isArray(profileData.ratings) && profileData.ratings.length > 0) ||
    (Array.isArray(personal.ratings) && (personal.ratings as unknown[]).length > 0);

  // Section 4 — Work and Qualifications
  const hasWork =
    (Array.isArray(profileData.workExperience) && profileData.workExperience.length > 0) ||
    (Array.isArray(personal.workExperience) && (personal.workExperience as unknown[]).length > 0) ||
    hasValue(profileData.work) ||
    hasValue(personal.work) ||
    (Array.isArray(profileData.experiences) && profileData.experiences.length > 0) ||
    (Array.isArray(personal.experiences) && (personal.experiences as unknown[]).length > 0);

  // Section 5 — Professional Profile
  const hasProfessional =
    hasValue(profileData.aboutMe) || hasValue(personal.aboutMe) ||
    hasValue(profileData.description) || hasValue(personal.description) ||
    hasValue(profileData.summary) || hasValue(personal.summary) ||
    hasValue(profileData.about) || hasValue(personal.about) ||
    hasValue(profileData.resume?.summary) || hasValue(profileData.resume?.about) ||
    hasValue(personal.resume);

  // Section 6 — Career and Skills
  const hasSkills =
    (Array.isArray(profileData.skills) && profileData.skills.length > 0) ||
    (Array.isArray(personal.skills) && (personal.skills as unknown[]).length > 0) ||
    (Array.isArray(profileData.structuredSkills) && profileData.structuredSkills.length > 0) ||
    hasValue(profileData.career) ||
    (Array.isArray(profileData.languages) && profileData.languages.length > 0) ||
    (Array.isArray(personal.languages) && (personal.languages as unknown[]).length > 0);

  let completedCount = 0;
  if (hasPersonal)     completedCount++;
  if (hasLicenses)     completedCount++;
  if (hasRatings)      completedCount++;
  if (hasWork)         completedCount++;
  if (hasProfessional) completedCount++;
  if (hasSkills)       completedCount++;

  return PERCENTAGE_MAP[Math.min(6, completedCount)];
}

const DEFAULT_SECTION_LABELS = [
  "Personal profile",
  "Professional details",
  "Experience",
  "Skills & Expertise",
];

export interface ProfileProgressWidgetProps {
  profileData?: ProfileData | null;
  className?: string;
  customLabels?: string[] | string;
}

export function ProfileProgressWidget({
  profileData,
  className = "",
  customLabels,
}: ProfileProgressWidgetProps) {
  const percentage = useMemo(
    () => calculateCompletionPercentage(profileData),
    [profileData]
  );

  const isComplete = percentage === 100;

  const displayLabels = useMemo(() => {
    if (typeof customLabels === "string") return customLabels;
    if (Array.isArray(customLabels)) return customLabels.join(" · ");
    return DEFAULT_SECTION_LABELS.join(" · ");
  }, [customLabels]);

  return (
    <div
      className={`bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs transition-all ${className}`}
    >
      {/* Title and Percentage Indicator */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900">
          Profile Completion
        </h3>
        <span className={`text-sm font-bold ${isComplete ? 'text-[#059669]' : 'text-blue-600'}`}>
          {percentage}% Complete
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
        {/* Dynamic Progress Fill */}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? 'bg-[#059669]' : 'bg-blue-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Section labels */}
      <p className="text-xs text-gray-400 leading-relaxed">
        {displayLabels}
      </p>
    </div>
  );
}

export default ProfileProgressWidget;
