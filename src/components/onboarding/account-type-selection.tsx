import { useState } from "react";
import { LogOut, Users, Building2, ChevronRight } from "lucide-react";

interface AccountTypeSelectionProps {
  onNext: (type: "flight_crew" | "business") => void;
  onBack: () => void;
}

export function AccountTypeSelection({ onNext, onBack }: AccountTypeSelectionProps) {
  const [selectedType, setSelectedType] = useState<"flight_crew" | "business" | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center py-4 mt-2">
        <button
          onClick={onBack}
          className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-700 rotate-180" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 mt-6">
        <h1 className="text-3xl font-extrabold mb-2 text-gray-900">I want to join as</h1>
        <p className="text-gray-600 mb-8 text-[15px]">
          Select the option that best describes you to personalize your experience.
        </p>

        <div className="space-y-4">
          {/* Flight Crew Card */}
          <button
            onClick={() => setSelectedType("flight_crew")}
            className={`w-full flex items-center p-5 rounded-2xl border ${
              selectedType === "flight_crew" 
                ? "border-[#2d73f5] bg-[#f0f5ff]" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            } transition-all`}
          >
            <div className={`p-3 rounded-full mr-4 flex-shrink-0 transition-colors ${
              selectedType === "flight_crew" ? "bg-white shadow-sm text-[#2d73f5]" : "bg-gray-50 text-gray-700"
            }`}>
              <Users className="w-6 h-6 fill-current" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-bold text-lg mb-1 text-gray-900">Flight Crew</h2>
              <p className="text-gray-500 text-[15px] leading-snug">
                I am a pilot, cabin crew member<br />or aviation professional.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
          </button>

          {/* Business Card */}
          <button
            onClick={() => setSelectedType("business")}
            className={`w-full flex items-center p-5 rounded-2xl border ${
              selectedType === "business" 
                ? "border-[#2d73f5] bg-[#f0f5ff]" 
                : "border-gray-100 hover:border-gray-200 bg-white"
            } transition-all`}
          >
            <div className={`p-3 rounded-full mr-4 flex-shrink-0 transition-colors ${
              selectedType === "business" ? "bg-[#d0e1ff] text-[#2d73f5]" : "bg-gray-50 text-gray-700"
            }`}>
              <Building2 className="w-6 h-6 fill-current" />
            </div>
            <div className="text-left flex-1">
              <h2 className="font-bold text-lg mb-1 text-gray-900">Business</h2>
              <p className="text-gray-500 text-[15px] leading-snug">
                I represent a company or<br />organization in aviation.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 pt-4">
        <button
          onClick={() => selectedType && onNext(selectedType)}
          disabled={!selectedType}
          className="w-full py-4 rounded-full font-bold text-white transition-colors bg-[#2d73f5] hover:bg-[#2d73f5]/90 disabled:bg-[#85b0fa] disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
