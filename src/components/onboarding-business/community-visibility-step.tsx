import { useState, useEffect } from "react";

interface CommunityVisibilityStepProps {
  onNext: () => void;
}

export function CommunityVisibilityStep({ onNext }: CommunityVisibilityStepProps) {
  const [advertising, setAdvertising] = useState(false);
  const [hiringPilots, setHiringPilots] = useState(false);
  const [hiringCabinCrew, setHiringCabinCrew] = useState(false);
  const [offerDiscounts, setOfferDiscounts] = useState(false);
  const [joinFounding, setJoinFounding] = useState(false);
  const [allowDMs, setAllowDMs] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("business_visibility");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (typeof data.advertising === 'boolean') setAdvertising(data.advertising);
        if (typeof data.hiringPilots === 'boolean') setHiringPilots(data.hiringPilots);
        if (typeof data.hiringCabinCrew === 'boolean') setHiringCabinCrew(data.hiringCabinCrew);
        if (typeof data.offerDiscounts === 'boolean') setOfferDiscounts(data.offerDiscounts);
        if (typeof data.joinFounding === 'boolean') setJoinFounding(data.joinFounding);
        if (typeof data.allowDMs === 'boolean') setAllowDMs(data.allowDMs);
      } catch(e) {}
    }
  }, []);

  const handleNext = () => {
    localStorage.setItem("business_visibility", JSON.stringify({
      advertising,
      hiringPilots,
      hiringCabinCrew,
      offerDiscounts,
      joinFounding,
      allowDMs
    }));
    onNext();
  };

  const ToggleRow = ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-[18px] border-b border-gray-100 last:border-0">
      <div className="pr-4">
        <h3 className="text-[15px] font-semibold text-gray-800">{label}</h3>
        {description && <p className="text-[13px] text-gray-500 mt-1">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-[50px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-[#2d73f5]" : "bg-gray-200"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-[22px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar">
        <div className="mt-4">
          <h2 className="font-bold text-base text-gray-900 mb-2">Visibility Options</h2>
          
          <div className="flex flex-col mt-2">
            <ToggleRow
              label="Interested in Advertising on Flight Crew Ranked"
              checked={advertising}
              onChange={setAdvertising}
            />
            <ToggleRow
              label="Interested in Hiring Pilots"
              checked={hiringPilots}
              onChange={setHiringPilots}
            />
            <ToggleRow
              label="Interested in Hiring Cabin Crew"
              checked={hiringCabinCrew}
              onChange={setHiringCabinCrew}
            />
            <ToggleRow
              label="Offer Discounts to Crew Members"
              checked={offerDiscounts}
              onChange={setOfferDiscounts}
            />
            <ToggleRow
              label="Join Founding Business Partners"
              checked={joinFounding}
              onChange={setJoinFounding}
            />
            <ToggleRow
              label="Allow Direct Messages from Crew Members"
              description="Allow crew members to contact your company directly."
              checked={allowDMs}
              onChange={setAllowDMs}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 pb-8 mt-auto bg-white border-t border-transparent">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-full font-bold text-white transition-colors bg-[#2d73f5] hover:bg-[#2d73f5]/90"
        >
          Next
        </button>
      </div>
    </div>
  );
}
