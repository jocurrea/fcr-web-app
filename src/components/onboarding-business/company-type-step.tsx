"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plane, GraduationCap, Building2, Handshake, Wrench, 
  Briefcase, UserSearch, Layers, Building, PlaneTakeoff, 
  ShoppingBag, MoreHorizontal
} from "lucide-react";

const COMPANY_TYPES = [
  { id: "airline", label: "Airline / Operator", icon: Plane },
  { id: "charter", label: "Charter Company", icon: Building2 },
  { id: "flight_school", label: "Flight School", icon: GraduationCap },
  { id: "fbo", label: "FBO", icon: Handshake },
  { id: "mro", label: "MRO / Maintenance", icon: Wrench },
  { id: "ground", label: "Ground Handling", icon: Briefcase },
  { id: "recruitment", label: "Aviation Recruitment", icon: UserSearch },
  { id: "training", label: "Training Center", icon: GraduationCap },
  { id: "technology", label: "Aviation Technology", icon: Layers },
  { id: "airport", label: "Airport Services", icon: Building },
  { id: "management", label: "Aircraft Management", icon: PlaneTakeoff },
  { id: "sales", label: "Aircraft Sales / Brokerage", icon: Handshake },
  { id: "retail", label: "Aviation Retail", icon: ShoppingBag },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

interface CompanyTypeStepProps {
  onNext: () => void;
}

export function CompanyTypeStep({ onNext }: CompanyTypeStepProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    // Save to local storage for review later
    localStorage.setItem("business_company_types", JSON.stringify(selectedTypes));
    onNext();
  };

  return (
    <div className="flex flex-col flex-1 h-full mt-2">
      <div className="mb-4">
        <p className="text-sm font-bold text-gray-900">Select all that apply</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-24 sm:pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1">
        <div className="space-y-3">
          {COMPANY_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <label
                key={type.id}
                onClick={() => toggleType(type.id)}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-3xl cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center text-gray-700">
                    <Icon className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <span className="text-[16px] text-gray-900 font-bold">{type.label}</span>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded border flex items-center justify-center transition-colors",
                  isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                )}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-4 sm:backdrop-blur-none">
        <Button 
          type="button" 
          onClick={handleNext}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
