"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BlockedUsersPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-white items-center py-10 px-4">
      <div className="flex flex-col w-full max-w-[500px] flex-1">
        
        {/* Header (Back button and Title) */}
        <div className="w-full relative flex justify-center items-center mb-16">
          <button 
            onClick={() => router.back()}
            className="absolute left-0 w-10 h-10 bg-[#f3f4f6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#1f2937]" strokeWidth={2.5} />
          </button>
          
          <h1 className="text-[19px] font-medium text-[#111827]">Blocked Users</h1>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center w-full mt-10">
          <p className="text-[15px] text-gray-400">
            You haven't blocked anyone
          </p>
        </div>

      </div>
    </div>
  );
}
