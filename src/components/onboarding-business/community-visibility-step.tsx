"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CommunityVisibilityStepProps {
  onNext: () => void;
}

export function CommunityVisibilityStep({ onNext }: CommunityVisibilityStepProps) {
  const [advertising, setAdvertising] = useState(true);
  const [hiringPilots, setHiringPilots] = useState(true);
  const [hiringCrew, setHiringCrew] = useState(true);
  const [offerDiscounts, setOfferDiscounts] = useState(true);
  const [joinFounding, setJoinFounding] = useState(true);
  const [allowDms, setAllowDms] = useState(true);

  const handleNext = () => {
    onNext();
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button 
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors flex items-center shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="flex flex-col flex-1 h-full mt-4">
      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 -mx-2">
        
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-gray-900">Visibility Options</h2>
        </div>

        <div className="space-y-0">
          
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-[15px] text-gray-900 font-medium pr-4">
              Interested in Advertising on Flight Crew Ranked
            </span>
            <Toggle checked={advertising} onChange={() => setAdvertising(!advertising)} />
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-[15px] text-gray-900 font-medium pr-4">
              Interested in Hiring Pilots
            </span>
            <Toggle checked={hiringPilots} onChange={() => setHiringPilots(!hiringPilots)} />
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-[15px] text-gray-900 font-medium pr-4">
              Interested in Hiring Cabin Crew
            </span>
            <Toggle checked={hiringCrew} onChange={() => setHiringCrew(!hiringCrew)} />
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-[15px] text-gray-900 font-medium pr-4">
              Offer Discounts to Crew Members
            </span>
            <Toggle checked={offerDiscounts} onChange={() => setOfferDiscounts(!offerDiscounts)} />
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-[15px] text-gray-900 font-medium pr-4">
              Join Founding Business Partners
            </span>
            <Toggle checked={joinFounding} onChange={() => setJoinFounding(!joinFounding)} />
          </div>

          <div className="flex items-start justify-between py-4">
            <div className="pr-4">
              <span className="text-[15px] text-gray-900 font-medium block mb-1">
                Allow Direct Messages from Crew Members
              </span>
              <span className="text-xs text-gray-500">
                Allow crew members to contact your company directly.
              </span>
            </div>
            <Toggle checked={allowDms} onChange={() => setAllowDms(!allowDms)} />
          </div>

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
