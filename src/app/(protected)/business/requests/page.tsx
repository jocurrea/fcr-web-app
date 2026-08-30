"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AffiliationRequestsManager } from "@/components/business/affiliation-requests-manager";

export default function BusinessRequestsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200/80 flex items-center justify-center text-gray-700 shadow-2xs transition-colors cursor-pointer"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
              Affiliation Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Manage incoming affiliation requests from aviation professionals.
            </p>
          </div>
        </div>

        {/* Manager Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100/90 shadow-sm">
          <AffiliationRequestsManager />
        </div>
      </div>
    </div>
  );
}
