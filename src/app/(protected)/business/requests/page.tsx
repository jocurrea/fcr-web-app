"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AffiliationRequestsManager } from "@/components/business/affiliation-requests-manager";

export default function BusinessRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 sm:px-0 py-6 md:py-8 gap-5">
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200/80 flex items-center justify-center text-gray-700 shadow-2xs transition-colors cursor-pointer shrink-0"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
            Affiliation requests
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Approve only professionals whose relationship with your company can verify.
          </p>
        </div>
      </div>

      {/* Manager Card Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs">
        <AffiliationRequestsManager hideHeader={true} />
      </div>
    </div>
  );
}

