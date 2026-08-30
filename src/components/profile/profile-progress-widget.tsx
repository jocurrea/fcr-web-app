"use client";

import React, { useMemo } from "react";
import {
  calculateCompletionPercentage,
  PERCENTAGE_MAP,
  ProfileData,
  SnapPercentage,
} from "@/utils/profileCompletion";

export { calculateCompletionPercentage, PERCENTAGE_MAP };
export type { ProfileData, SnapPercentage };

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
        <span
          className={`text-sm font-bold ${
            isComplete ? "text-[#059669]" : "text-blue-600"
          }`}
        >
          {percentage}% Complete
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
        {/* Dynamic Progress Fill with Snapped Percentages */}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isComplete ? "bg-[#059669]" : "bg-blue-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Section labels */}
      <p className="text-xs text-gray-400 leading-relaxed">{displayLabels}</p>
    </div>
  );
}

export default ProfileProgressWidget;
