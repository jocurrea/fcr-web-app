"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotificationsPage() {
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col pt-6 pb-24">
      <div className="px-4 max-w-lg mx-auto w-full relative flex flex-col gap-10">
        
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button 
            onClick={() => router.back()}
            className="absolute left-0 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
          <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">Notifications</h1>
        </div>

        {/* Empty State */}
        <div className="flex justify-center mt-2">
          <p className="text-[14px] font-medium text-gray-500">No notifications yet</p>
        </div>

      </div>
    </div>
  );
}
