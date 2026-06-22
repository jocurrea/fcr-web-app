"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plane, PlaneTakeoff, GraduationCap, Building, Wrench, 
  Truck, Users, BookOpen, Laptop, Briefcase, 
  Settings, ShoppingCart, ShoppingBag, Grid
} from "lucide-react";

const COMPANY_TYPES = [
  { id: "airline", label: "Airline / Operator", icon: Plane },
  { id: "charter", label: "Charter Company", icon: PlaneTakeoff },
  { id: "flight_school", label: "Flight School", icon: GraduationCap },
  { id: "fbo", label: "FBO", icon: Building },
  { id: "mro", label: "MRO / Maintenance", icon: Wrench },
  { id: "ground", label: "Ground Handling", icon: Truck },
  { id: "recruitment", label: "Aviation Recruitment", icon: Users },
  { id: "training", label: "Training Center", icon: BookOpen },
  { id: "technology", label: "Aviation Technology", icon: Laptop },
  { id: "airport", label: "Airport Services", icon: Briefcase },
  { id: "management", label: "Aircraft Management", icon: Settings },
  { id: "sales", label: "Aircraft Sales / Brokerage", icon: ShoppingCart },
  { id: "retail", label: "Aviation Retail", icon: ShoppingBag },
  { id: "other", label: "Other", icon: Grid },
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
        <p className="text-sm font-semibold text-gray-800">Select all that apply</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 -mx-2">
        <div className="space-y-1">
          {COMPANY_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <label
                key={type.id}
                onClick={() => toggleType(type.id)}
                className="flex items-center justify-between p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[15px] text-gray-900 font-medium">{type.label}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                  isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                )}>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 sm:backdrop-blur-none">
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
