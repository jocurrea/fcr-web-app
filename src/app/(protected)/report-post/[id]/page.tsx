"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Megaphone, ShieldAlert, Ban, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";
import { useState, Suspense } from "react";

function ReportPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reportReasons = [
    { id: "spam", label: "Spam", icon: Megaphone },
    { id: "harassment", label: "Harassment", icon: ShieldAlert },
    { id: "hate", label: "Hate Speech", icon: Ban },
    { id: "inappropriate", label: "Inappropriate Content", icon: AlertTriangle },
    { id: "child_safety", label: "Child Safety", icon: ShieldCheck },
  ];

  const handleReport = (reasonId: string) => {
    // Here you would typically send an API request to log the report in the database
    const returnTo = searchParams.get("returnTo") || "/home";
    const redirectUrl = returnTo.includes('?') ? `${returnTo}&reported=true` : `${returnTo}?reported=true`;
    router.push(redirectUrl);
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-[#f8f9fa] min-h-screen z-50 fixed inset-0 md:relative md:inset-auto">
      {/* Header */}
      <header className="flex items-center py-5 px-4 relative mt-2 bg-[#f8f9fa]">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors rounded-full"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </button>
        <h1 className="flex-1 text-center text-[19px] font-semibold text-gray-900 pr-10">Report Post</h1>
      </header>

      {/* Content */}
      <div className="px-5 mt-4">
        <h2 className="text-[15px] font-medium text-gray-700 mb-5 ml-1">Why are you reporting this post?</h2>
        
        <div className="flex flex-col gap-3">
          {reportReasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <button
                key={reason.id}
                onClick={() => handleReport(reason.id)}
                className="w-full flex items-center justify-between bg-gray-100/80 hover:bg-gray-200/80 transition-colors rounded-[16px] px-5 py-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <Icon className="w-5 h-5 text-gray-700 stroke-[1.5]" />
                  <span className="text-[15px] font-semibold text-gray-900">{reason.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 stroke-[1.5]" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ReportPostPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa]" />}>
      <ReportPostContent />
    </Suspense>
  );
}
