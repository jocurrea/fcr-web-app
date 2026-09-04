import { useState, useEffect, useMemo } from "react";
import { 
  Users, User, MapPin, Mail, Phone, Globe, Calendar, Briefcase, Eye, Plane, Loader2
} from "lucide-react";
import { useBusinessOnboarding } from "@/components/onboarding-business/business-onboarding-context";
import { supabase } from "@/lib/supabase";
import { revalidateProfileLayout } from "@/actions/profile";

interface ReviewFinishStepProps {
  onNext: () => void;
}

export function ReviewFinishStep({ onNext }: ReviewFinishStepProps) {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState({
    companyTypes: [] as string[],
    profile: {
      companyName: "Not provided",
      location: "Not provided",
      email: "Not provided",
      phone: "Not provided",
      website: "Not provided",
      foundedYear: "Not provided",
      description: "Not provided",
      operatingAreas: [] as string[],
      servicesOffered: [] as string[],
      fleetTypes: [] as string[],
      logo: null as string | null,
    },
    visibility: {} as Record<string, boolean>
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onboarding, error: loadError, submit } = useBusinessOnboarding();

  const isEditMode = useMemo(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("edit") === "true" ||
        params.get("edit") === "company" ||
        params.get("from") === "profile"
      ) {
        return true;
      }
    }
    return (
      onboarding?.company?.status === "active" ||
      onboarding?.company?.status === "approved"
    );
  }, [onboarding?.company?.status]);

  useEffect(() => {
    if (!onboarding) return;

    const { company, companyTypes, selectedCompanyTypeKeys, settings } = onboarding;
    const labelsByKey = new Map(companyTypes.map((companyType) => [companyType.key, companyType.label]));

    const otherText =
      onboarding.otherTypeText ||
      (typeof window !== "undefined" && company.id ? localStorage.getItem("company_other_type_" + company.id) : null);

    const resolvedCompanyTypes = selectedCompanyTypeKeys.map((typeKey) => {
      if (typeKey === "other" && otherText) {
        return otherText;
      }
      return labelsByKey.get(typeKey) || typeKey;
    });

    setData({
      companyTypes: resolvedCompanyTypes,
      profile: {
        companyName: company.name || "Not provided",
        location: company.location || "Not provided",
        email: company.contact_email || "Not provided",
        phone: company.phone || "Not provided",
        website: company.website || "Not provided",
        foundedYear: company.founded_year ? String(company.founded_year) : "Not provided",
        description: company.description || "Not provided",
        operatingAreas: company.operating_areas || [],
        servicesOffered: company.services || [],
        fleetTypes: company.fleet_types || [],
        logo: company.logo_url || null,
      },
      visibility: {
        advertising: !!settings?.interested_in_advertising,
        hiringPilots: !!settings?.interested_in_hiring_pilots,
        hiringCabinCrew: !!settings?.interested_in_hiring_cabin_crew,
        offerDiscounts: !!settings?.offers_crew_discounts,
        joinFounding: !!settings?.join_founding_partners,
        allowDMs: !!settings?.allow_crew_direct_messages,
      },
    });
  }, [onboarding]);

  const renderPills = (items: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-[#eef4ff] text-[#2d73f5] px-4 py-[10px] rounded-full text-[14px] font-semibold leading-tight">
            {item}
          </div>
        ))}
      </div>
    );
  };

  const getVisibilityLabels = () => {
    const labels = [];
    if (data.visibility.advertising) labels.push("Interested in Advertising on Flight Crew Ranked");
    if (data.visibility.hiringPilots) labels.push("Interested in Hiring Pilots");
    if (data.visibility.hiringCabinCrew) labels.push("Interested in Hiring Cabin Crew");
    if (data.visibility.offerDiscounts) labels.push("Offer Discounts to Crew Members");
    if (data.visibility.joinFounding) labels.push("Join Founding Business Partners");
    if (data.visibility.allowDMs) labels.push("Allow Direct Messages from Crew Members");
    return labels;
  };

  const visibilityPills = getVisibilityLabels();

  const handleCreateAccount = async () => {
    setIsSubmitting(true);
    setError(null);

    const res = await submit();

    setIsSubmitting(false);

    if (res.success) {
      // Re-fetch get_my_profile RPC, revalidate layout, and dispatch event for immediate navbar sync
      try {
        await supabase.rpc("get_my_profile");
        await revalidateProfileLayout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profile-updated"));
        }
      } catch (syncErr) {
        console.warn("[ReviewFinishStep] get_my_profile sync error:", syncErr);
      }
      setShowModal(true);
    } else {
      setError(res.error || "Failed to create account.");
    }
  };

  const handleModalOk = () => {
    onNext();
  };

  return (
    <div className="flex flex-col flex-1 h-full relative">
      <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar space-y-8 mt-4">
        
        {/* Company Type Section */}
        {data.companyTypes.length > 0 && (
          <div>
            <h2 className="font-bold text-[16px] text-gray-900 mb-3">Company Type</h2>
            <div className="flex items-start">
              <Users className="w-5 h-5 text-gray-800 mr-3 mt-0.5 shrink-0" />
              <p className="text-[15px] text-gray-800 leading-snug">
                {data.companyTypes.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Company Information Section */}
        <div>
          <h2 className="font-bold text-[16px] text-gray-900 mb-4">Company Information</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="w-5 h-5 text-gray-800 mr-3 shrink-0" />
              <p className="text-[15px] text-gray-800">{data.profile.companyName}</p>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-gray-800 mr-3 shrink-0" />
              <p className="text-[15px] text-gray-800">{data.profile.location}</p>
            </div>
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-800 mr-3 shrink-0" />
              <p className="text-[15px] text-gray-800">{data.profile.email}</p>
            </div>
            {data.profile.phone !== "Not provided" && (
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-800 mr-3 shrink-0" />
                <p className="text-[15px] text-gray-800">{data.profile.phone}</p>
              </div>
            )}
            {data.profile.website !== "Not provided" && (
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-gray-800 mr-3 shrink-0" />
                <p className="text-[15px] text-gray-800">{data.profile.website}</p>
              </div>
            )}
            {data.profile.foundedYear !== "Not provided" && (
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-800 mr-3 shrink-0" />
                <p className="text-[15px] text-gray-800">Founded in {data.profile.foundedYear}</p>
              </div>
            )}
            {data.profile.operatingAreas.length > 0 && (
              <div className="flex items-start">
                <Globe className="w-5 h-5 text-gray-800 mr-3 mt-0.5 shrink-0" />
                <p className="text-[15px] text-gray-800 leading-snug">Areas: {data.profile.operatingAreas.join(", ")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Company Profile Section */}
        <div>
          <div className="flex items-center mb-3">
            <User className="w-5 h-5 text-gray-900 mr-2 shrink-0" />
            <h2 className="font-bold text-[16px] text-gray-900">Company Profile</h2>
          </div>
          <div className="p-4 border border-gray-100 rounded-[20px] flex items-start shadow-sm">
            <div className="w-[60px] h-[60px] bg-[#eef4ff] rounded-2xl flex items-center justify-center shrink-0 mr-4 overflow-hidden relative">
              {data.profile.logo ? (
                <img src={data.profile.logo} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Briefcase className="w-6 h-6 text-[#2d73f5] fill-current" />
              )}
            </div>
            <div className="flex-1 mt-1">
              <p className="font-bold text-[15px] text-gray-900 mb-1">{data.profile.companyName}</p>
              <p className="text-[14px] text-gray-500 leading-snug line-clamp-4">
                {data.profile.description}
              </p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        {data.profile.servicesOffered.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <Briefcase className="w-5 h-5 text-gray-900 mr-2 shrink-0" />
              <h2 className="font-bold text-[16px] text-gray-900">Services</h2>
            </div>
            {renderPills(data.profile.servicesOffered)}
          </div>
        )}

        {/* Fleet Types Section */}
        {data.profile.fleetTypes.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <Plane className="w-5 h-5 text-gray-900 mr-2 shrink-0" />
              <h2 className="font-bold text-[16px] text-gray-900">Fleet Types</h2>
            </div>
            {renderPills(data.profile.fleetTypes)}
          </div>
        )}

        {/* Operating Areas Section (Pills format) */}
        {data.profile.operatingAreas.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <Globe className="w-5 h-5 text-gray-900 mr-2 shrink-0" />
              <h2 className="font-bold text-[16px] text-gray-900">Operating Areas</h2>
            </div>
            {renderPills(data.profile.operatingAreas)}
          </div>
        )}

        {/* Community & Visibility Section */}
        {visibilityPills.length > 0 && (
          <div className="pb-4">
            <div className="flex items-center mb-2">
              <Eye className="w-5 h-5 text-gray-900 mr-2 shrink-0" />
              <h2 className="font-bold text-[16px] text-gray-900">Community & Visibility</h2>
            </div>
            {renderPills(visibilityPills)}
          </div>
        )}

      </div>

      {/* Error Message */}
      {(error || loadError) && (
        <div className="text-red-500 text-sm text-center mb-2 px-4">
          {error || loadError}
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 pb-8 mt-auto bg-white border-t border-transparent z-10 relative">
        <button
          onClick={handleCreateAccount}
          disabled={isSubmitting}
          className="w-full py-4 rounded-full font-bold text-white transition-colors bg-[#2d73f5] hover:bg-[#2d73f5]/90 disabled:opacity-70 flex items-center justify-center cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isEditMode ? (
            "Update profile"
          ) : (
            "Complete onboarding"
          )}
        </button>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-[#383838] rounded-lg p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-3">
              {isEditMode ? "Profile Updated" : "Company Submitted"}
            </h3>
            <p className="text-gray-300 text-[15px] leading-snug mb-8">
              {isEditMode
                ? "Your company profile has been updated successfully."
                : "Your company profile has been submitted successfully."}
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleModalOk}
                className="text-[#5eead4] font-semibold tracking-wide hover:text-[#2dd4bf] transition-colors uppercase text-[15px] cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
