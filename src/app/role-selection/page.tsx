"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, UserCircle, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

const PilotHatIcon = () => (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 14C4 10 10 6 16 6C22 6 28 10 28 14" fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M3 14H29V18C29 19.5 28 20 27 20H5C4 20 3 19.5 3 18V14Z" fill="#2563eb" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M4 20C4 20 4 23 8 23C12 23 16 24 16 24C16 24 20 23 24 23C28 23 28 20 28 20" fill="#0f172a" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="11" r="3" fill="white" stroke="#0f172a" strokeWidth="2"/>
  </svg>
);

const BusinessIcon = () => (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="12" height="18" fill="#bfdbfe" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round"/>
    <rect x="17" y="14" width="10" height="12" fill="#bfdbfe" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M3 26H29" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="8" y="11" width="2" height="2" fill="#0f172a"/>
    <rect x="12" y="11" width="2" height="2" fill="#0f172a"/>
    <rect x="8" y="15" width="2" height="2" fill="#0f172a"/>
    <rect x="12" y="15" width="2" height="2" fill="#0f172a"/>
    <rect x="8" y="19" width="2" height="2" fill="#0f172a"/>
    <rect x="12" y="19" width="2" height="2" fill="#0f172a"/>
    <rect x="21" y="17" width="2" height="2" fill="#0f172a"/>
    <rect x="21" y="21" width="2" height="2" fill="#0f172a"/>
  </svg>
);

export default function RoleSelectionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col mx-auto max-w-xl h-screen px-6 py-8">
      {/* Header */}
      <div className="flex items-center w-full mb-8">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Titles */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          I want to join as
        </h1>
        <p className="text-sm text-gray-500">
          Select the option that best describes you to personalize your experience.
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-4">
        {/* Flight Crew Option */}
        <button
          onClick={() => router.push("/onboarding")}
          className="flex items-center p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow text-left group"
        >
          <div className="w-14 h-14 bg-[#f0f4ff] rounded-full flex items-center justify-center shrink-0 mr-4 group-hover:scale-105 transition-transform">
            <PilotHatIcon />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-0.5">Flight Crew</h2>
            <p className="text-xs text-gray-500 leading-snug">
              I am a pilot, cabin crew member or aviation professional.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
        </button>

        {/* Business Option */}
        <button
          onClick={() => router.push("/onboarding-business")}
          className="flex items-center p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow text-left group"
        >
          <div className="w-14 h-14 bg-[#f0f4ff] rounded-full flex items-center justify-center shrink-0 mr-4 group-hover:scale-105 transition-transform">
            <BusinessIcon />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-0.5">Business</h2>
            <p className="text-xs text-gray-500 leading-snug">
              I represent a company or organization in aviation.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
        </button>
      </div>
      </div>
    </div>
  );
}
