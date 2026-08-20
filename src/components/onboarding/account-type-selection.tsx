import { useState } from "react";
import { LogOut, Users, User, Check } from "lucide-react";

interface AccountTypeSelectionProps {
  onNext: (type: "flight_crew" | "business" | "aviation_professional") => void;
  onBack: () => void;
}

export function AccountTypeSelection({ onNext, onBack }: AccountTypeSelectionProps) {
  const [selectedType, setSelectedType] = useState<"flight_crew" | "business" | "aviation_professional" | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Top Header with Left Back Button & Centered Logo */}
      <div className="relative flex items-center justify-center w-full pt-2 pb-6">
        <button 
          onClick={onBack}
          className="absolute left-0 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center transition-colors hover:bg-gray-50 cursor-pointer"
          title="Back / Logout"
        >
          <LogOut className="w-5 h-5 text-gray-700 rotate-180" />
        </button>

        <img 
          src="/img/FCRlogo2.png" 
          alt="Flight Crew Ranked" 
          className="w-[215px] sm:w-[245px] h-auto object-contain" 
        />
      </div>

      {/* Content */}
      <div className="flex-1 mt-2">
        <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Create Account</h1>
        <p className="text-gray-600 mb-8 text-[15px]">
          Choose how you want to join Flight Crew Ranked
        </p>

        <div className="space-y-4">
          {/* Flight Crew Card */}
          <button
            type="button"
            onClick={() => setSelectedType("flight_crew")}
            className={`w-full flex items-center p-5 rounded-2xl border transition-all cursor-pointer text-left group ${
              selectedType === "flight_crew" 
                ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            }`}
          >
            <div className="shrink-0 mr-4 flex items-center justify-center">
              <Users className="w-7 h-7 text-[#1d4ed8] fill-[#1d4ed8]" />
            </div>
            <div className="text-left flex-1 min-w-0 pr-2">
              <h2 className="font-bold text-lg mb-0.5 text-gray-900">Flight Crew</h2>
              <p className="text-gray-500 text-xs leading-snug">
                For pilots and cabin crew members.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
              selectedType === "flight_crew" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
            }`}>
              {selectedType === "flight_crew" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
          </button>

          {/* Business Card */}
          <button
            type="button"
            onClick={() => setSelectedType("business")}
            className={`w-full flex items-center p-5 rounded-2xl border transition-all cursor-pointer text-left group ${
              selectedType === "business" 
                ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            }`}
          >
            <div className="shrink-0 mr-4 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#1d4ed8]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 21V9l6-4v16H4zm8 0V3l8 4v14h-8zm-6-4h2v-2H6v2zm0-4h2v-2H6v2zm8 4h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2z" />
              </svg>
            </div>
            <div className="text-left flex-1 min-w-0 pr-2">
              <h2 className="font-bold text-lg mb-0.5 text-gray-900">Company / Business</h2>
              <p className="text-gray-500 text-xs leading-snug">
                For aviation companies and organizations.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
              selectedType === "business" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
            }`}>
              {selectedType === "business" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
          </button>

          {/* Aviation Professional Card */}
          <button
            type="button"
            onClick={() => setSelectedType("aviation_professional")}
            className={`w-full flex items-center p-5 rounded-2xl border transition-all cursor-pointer text-left group ${
              selectedType === "aviation_professional" 
                ? "border-[#1d4ed8] bg-[#f0f5ff] ring-2 ring-[#1d4ed8]/20 shadow-sm" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            }`}
          >
            <div className="shrink-0 mr-4 flex items-center justify-center">
              <User className="w-7 h-7 text-[#1d4ed8] fill-[#1d4ed8]" />
            </div>
            <div className="text-left flex-1 min-w-0 pr-2">
              <h2 className="font-bold text-lg mb-0.5 text-gray-900">Aviation Professional</h2>
              <p className="text-gray-500 text-xs leading-snug">
                For aviation professionals and specialists.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ml-2 transition-all ${
              selectedType === "aviation_professional" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "border-2 border-gray-300 group-hover:border-gray-400 bg-white"
            }`}>
              {selectedType === "aviation_professional" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 pt-4">
        <button
          type="button"
          onClick={() => selectedType && onNext(selectedType)}
          disabled={!selectedType}
          className={`w-full py-4 rounded-full font-bold text-white transition-all shadow-md ${
            selectedType
              ? "bg-[#1d4ed8] hover:bg-[#1e40af] cursor-pointer" 
              : "bg-[#85b0fa] cursor-not-allowed opacity-90"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
