"use client";

import { Button } from "@/components/ui/button";
import { User, MapPin, Mail, Phone, Globe, Calendar, Map, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReviewFinishStepProps {
  onNext: () => void;
}

export function ReviewFinishStep({ onNext }: ReviewFinishStepProps) {
  const router = useRouter();

  const handleConfirm = () => {
    // In a real app we'd save to DB here
    onNext();
  };

  return (
    <div className="flex flex-col flex-1 h-full mt-4">
      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 -mx-2">
        
        <div className="space-y-6">
          
          {/* Company Type */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Company Type</h3>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Airline / Operator, Charter Company</span>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Company Information */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Company Information</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Pilot Insight Aviation</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Miami, Florida, United States</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">info@pilotinsight.com</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">+1 (305) 555-0198</span>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">www.pilotinsight.com</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Founded in 2018</span>
              </div>
              <div className="flex items-start gap-2">
                <Map className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700">Areas: North America, Europe, Latin America, Middle East</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Company Profile */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-4 h-4 text-gray-400 shrink-0 border border-gray-300 rounded-sm inline-flex items-center justify-center">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              Company Profile
            </h3>
            
            <div className="flex gap-3 mb-4">
              <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shrink-0 text-gray-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[13px] text-gray-600 leading-snug">
                Pilot Insight Aviation is a global aviation solutions company providing executive charter, aircraft management, and crew services with the highest safety and...
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900">Services: </span>
                <span className="text-[13px] text-gray-600 leading-snug">
                  Pilot Hiring, Cabin Crew Hiring, Training, Aircraft Charter, Maintenance, Ground Services, Dispatch, Crew Accommodation, Aviation Software
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 sm:backdrop-blur-none">
        <Button 
          type="button" 
          onClick={handleConfirm}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6 text-lg font-semibold"
        >
          Confirm & Create Account
        </Button>
      </div>
    </div>
  );
}
