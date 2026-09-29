"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, User, MapPin, Briefcase } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SearchUser {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  role?: string;
  professionalRole?: string;
  professionalTitleKey?: string;
  location?: string;
  workAvailabilityStatus?: string;
  isAvailableForWork: boolean;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchUsers = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      let req = supabase
        .from("users")
        .select("id, firstName, lastName, profileImage, role, professionalRole, professionalTitleKey, location, availability_status, work_availability")
        .limit(25);

      const trimmed = searchQuery.trim();
      if (trimmed) {
        req = req.or(`firstName.ilike.%${trimmed}%,lastName.ilike.%${trimmed}%,role.ilike.%${trimmed}%,professionalRole.ilike.%${trimmed}%`);
      }

      const { data: usersData, error: usersErr } = await req;
      if (usersErr) throw usersErr;

      const userIds = (usersData || []).map((u) => u.id);

      // Fetch user_profiles to ensure up-to-date workAvailabilityStatus
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("user_profiles")
          .select("user_id, workAvailabilityStatus")
          .in("user_id", userIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            if (p.user_id && p.workAvailabilityStatus) {
              profilesMap[p.user_id] = p.workAvailabilityStatus;
            }
          });
        }
      }

      const formatted: SearchUser[] = (usersData || []).map((u) => {
        const rawAvail =
          profilesMap[u.id] ||
          u.availability_status ||
          u.work_availability ||
          "active";

        const isAvailable =
          rawAvail === "available_for_work" ||
          rawAvail === "available" ||
          rawAvail === "#OpenToWork" ||
          rawAvail === "open_to_work";

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          profileImage: u.profileImage,
          role: u.role,
          professionalRole: u.professionalRole,
          professionalTitleKey: u.professionalTitleKey,
          location: u.location,
          workAvailabilityStatus: rawAvail,
          isAvailableForWork: isAvailable,
        };
      });

      setUsers(formatted);
    } catch (err) {
      console.error("Error searching users:", err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        fetchUsers(query);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="max-w-xl mx-auto flex flex-col w-full px-4 pt-8 pb-16">
      <h1 className="text-left text-2xl font-bold text-gray-900 mb-6">
        Search People
      </h1>

      {/* Search Input Bar */}
      <div className="relative w-full mb-6">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role, or expertise..."
          className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition-all shadow-xs text-sm text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {isLoading ? "Searching..." : `Results (${users.length})`}
        </span>
      </div>

      {/* Results List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Finding aviation professionals...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-xs">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-800">No professionals found</p>
            <p className="text-xs text-gray-500 mt-1">Try another search term or clear the filter.</p>
          </div>
        ) : (
          users.map((person) => {
            const fullName = `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Aviation Member";
            const roleDisplay = person.professionalRole || person.role || "Aviation Professional";

            return (
              <Link
                key={person.id}
                href={`/profile/${person.id}`}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs hover:border-gray-300 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar with Status Ring & Badge Indicator (Scenario 2) */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full overflow-hidden bg-gray-100 border transition-all",
                        person.isAvailableForWork
                          ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "border-gray-200"
                      )}
                    >
                      {person.profileImage ? (
                        <img
                          src={person.profileImage}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1d4ed8] text-white font-extrabold flex items-center justify-center text-sm">
                          {fullName[0]?.toUpperCase() || "A"}
                        </div>
                      )}
                    </div>

                    {/* Indicator Dot on Avatar */}
                    {person.isAvailableForWork ? (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs"
                        title="Available for Work"
                      />
                    ) : (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-xs"
                        title="Active / Employed"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors truncate">
                      {fullName}
                    </h2>
                    <p className="text-xs text-[#1d4ed8] font-semibold capitalize truncate">
                      {roleDisplay.replace(/_/g, " ")}
                    </p>
                    {person.location && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                        <span>{person.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Availability Badge (Scenario 3) */}
                <div className="shrink-0">
                  {person.isAvailableForWork ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      Available for Work
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200/70 whitespace-nowrap">
                      Active
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

