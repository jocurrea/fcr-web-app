"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  ShieldCheck,
  Search,
  ExternalLink,
  MapPin,
  Mail,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AffiliatedProfessional {
  id: string;
  user_id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  role?: string | null;
  position?: string | null;
  profileImage?: string | null;
  location?: string | null;
  email?: string | null;
  affiliatedSince?: string | null;
}

export default function AffiliatedProfessionalsPage() {
  const router = useRouter();
  const [professionals, setProfessionals] = useState<AffiliatedProfessional[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ensure clean top position when mounting
    window.scrollTo(0, 0);

    async function loadAffiliatedProfessionals() {
      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/welcome");
          return;
        }

        // 1. Get current user's company
        const { data: company } = await supabase
          .from("companies")
          .select("id, name")
          .eq("owner_user_id", session.user.id)
          .order("created_at", { ascending: false })
          .maybeSingle();

        if (!company) {
          setProfessionals([]);
          return;
        }

        // 2. Get approved affiliations via RPC (direct table access is blocked by RLS)
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_company_affiliated_professionals",
          { target_company_id: company.id }
        );

        if (rpcError) {
          console.error("[Professionals] RPC error:", rpcError.message);
          setProfessionals([]);
          return;
        }

        const affiliations = Array.isArray(rpcData) ? rpcData : [];

        if (affiliations.length === 0) {
          setProfessionals([]);
          return;
        }

        const formatted: AffiliatedProfessional[] = affiliations.map((item: any) => {
          const fullName =
            [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
            item.username ||
            item.full_name ||
            "Aviation Professional";

          return {
            id: item.user_id || item.id,
            user_id: item.user_id,
            firstName: item.first_name,
            lastName: item.last_name,
            fullName,
            username: item.username,
            role: item.role || item.position || "Aviation Specialist",
            profileImage: item.profile_image || item.profileImage || null,
            location: item.location || null,
            email: item.email || null,
            affiliatedSince: item.created_at,
          };
        });

        setProfessionals(formatted);
      } catch (err) {
        console.error("Error loading affiliated professionals:", err);
        setProfessionals([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadAffiliatedProfessionals();
  }, [router]);

  const filteredProfessionals = professionals.filter((prof) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (prof.fullName && prof.fullName.toLowerCase().includes(q)) ||
      (prof.role && prof.role.toLowerCase().includes(q)) ||
      (prof.location && prof.location.toLowerCase().includes(q)) ||
      (prof.email && prof.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 sm:px-0 py-6 md:py-8 gap-5">
      {/* Top Header Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200/80 flex items-center justify-center text-gray-700 shadow-2xs transition-colors cursor-pointer shrink-0"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm sm:text-base font-bold text-gray-900">
          Affiliated professionals
        </span>
      </div>

      {/* Main Section Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
          Verified professionals
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">
          These professional profiles are publicly verified as affiliated with your company.
        </p>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1d4ed8]" />
          <p className="text-xs sm:text-sm font-medium text-gray-500">
            Loading affiliated professionals...
          </p>
        </div>
      ) : professionals.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1d4ed8] shadow-2xs mb-1">
            <Users className="w-8 h-8 text-[#1d4ed8]" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              No affiliated professionals
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Approved requests and accepted company invitations will appear here.
            </p>
          </div>
        </div>
      ) : (
        /* Populated List */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role or location..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all shadow-2xs"
            />
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredProfessionals.map((prof) => (
              <div
                key={prof.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center shadow-2xs">
                    {prof.profileImage ? (
                      <img
                        src={prof.profileImage}
                        alt={prof.fullName || "Professional"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#1d4ed8] font-extrabold text-base">
                        {prof.fullName?.[0]?.toUpperCase() || "P"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                        {prof.fullName}
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#1d4ed8] mt-0.5 truncate">
                      {prof.role}
                    </p>
                    {prof.location && (
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{prof.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={`/profile/${prof.id}`}
                  className="p-2.5 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-[#1d4ed8] transition-colors shrink-0"
                  title="View profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
