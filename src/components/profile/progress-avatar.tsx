"use client";

import React from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

interface ProgressAvatarProps {
  size?: number; // Total diameter of the component in pixels
  percentage: number;
  imageUrl?: string | null;
  className?: string;
  onClick?: () => void;
  showBadge?: boolean;
  showRing?: boolean;
  showEditIcon?: boolean;
  editLink?: string;
  accountType?: string;
}

export function ProgressAvatar({
  size = 156, // Default to profile size
  percentage,
  imageUrl,
  className = "",
  onClick,
  showBadge = true,
  showRing = true,
  showEditIcon = false,
  editLink = "/onboarding?edit=true",
  accountType,
}: ProgressAvatarProps) {
  // Business accounts do not use profile completion percentages or progress rings
  const isBusiness = accountType === "business";
  const shouldRenderRing = showRing && !isBusiness;
  const shouldRenderBadge = showBadge && !isBusiness;

  // Enforce limits
  const safePercentage = Math.min(100, Math.max(0, percentage || 0));
  
  const strokeColor = safePercentage === 100 ? "#059669" : "#f97316";

  const isSmall = size <= 60;
  
  // padding around the image
  const padding = shouldRenderRing ? (isSmall ? 3 : 6) : 0;
  const innerSize = size - (padding * 2);

  // SVG dimensions
  const viewBoxSize = size;
  const center = size / 2;
  const strokeWidth = isSmall ? 2.5 : 8;
  const radius = center - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * safePercentage) / 100;

  return (
    <div 
      className={`relative inline-flex items-center justify-center bg-white rounded-full ${isSmall ? 'shadow-sm' : 'shadow-xl'} ${className}`} 
      style={{ width: size, height: size, padding: padding }}
      onClick={onClick}
    >
      {/* Progress Ring SVG (Only if shouldRenderRing is true) */}
      {shouldRenderRing && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-20" 
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Active Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
      )}

      {/* Avatar Photo */}
      <div 
        className="rounded-full overflow-hidden bg-gray-100 z-10 w-full h-full"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            {isSmall ? (
              <span className="font-medium text-[10px]">Me</span>
            ) : (
              <svg className="w-[40%] h-[40%]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            )}
          </div>
        )}
      </div>

      {/* Percentage Badge */}
      {shouldRenderBadge && (
        <div 
          className={`absolute left-1/2 -translate-x-1/2 bg-white rounded-full font-bold border border-gray-200 shadow-lg z-50 flex items-center justify-center
            ${isSmall 
              ? `px-1.5 py-[1px] text-[9px] leading-tight ${safePercentage === 100 ? 'text-[#059669]' : 'text-[#f97316]'}` 
              : `px-3 py-0.5 text-[12px] ${safePercentage === 100 ? 'text-[#059669]' : 'text-[#f97316]'}`
            }
          `}
          style={{ bottom: isSmall ? '-6px' : '-10px' }}
        >
          {safePercentage}%
        </div>
      )}

      {/* Edit Icon */}
      {showEditIcon && !isSmall && (
        <Link 
          href={editLink} 
          className="absolute bottom-0 right-0 w-9 h-9 bg-white border-2 border-white rounded-full flex items-center justify-center shadow-lg text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer z-50"
        >
          <Pencil className="w-[16px] h-[16px]" />
        </Link>
      )}
    </div>
  );
}
