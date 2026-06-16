"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function TermsAndConditionsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-white items-center py-10 px-4">
      <div className="flex flex-col w-full max-w-[400px] flex-1">
        
        {/* Back Button */}
        <div className="w-full flex justify-start mb-16">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#f3f4f6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#1f2937]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center w-full">
          <h1 className="text-[22px] font-bold text-[#1f2937] tracking-tight mb-4">Terms & Conditions</h1>
          
          <button className="text-[14px] text-blue-500 font-medium hover:underline mb-12">
            Download
          </button>
          
          <p className="text-[15px] text-gray-500">
            No terms and conditions found
          </p>
        </div>

      </div>
    </div>
  );
}
