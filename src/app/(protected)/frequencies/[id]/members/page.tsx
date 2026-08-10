"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { fetchFrequencyMembers, FrequencyMember } from "@/lib/api/frequencies";
import Link from "next/link";

export default function FrequencyMembersPage() {
  const router = useRouter();
  const params = useParams();
  const frequencyId = params?.id as string;

  const [members, setMembers] = useState<FrequencyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!frequencyId) return;
    async function loadMembers() {
      setLoading(true);
      const data = await fetchFrequencyMembers(frequencyId);
      setMembers(data);
      setLoading(false);
    }
    loadMembers();
  }, [frequencyId]);

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-white min-h-screen">
      {/* Header */}
      <header className="flex items-center py-5 px-4 relative mt-2 mb-4">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </button>
        <h1 className="flex-1 text-center text-[20px] font-medium text-[#0f172a] pr-10">Frequency Members</h1>
      </header>

      {/* Members List */}
      <div className="flex flex-col px-6 gap-6 mt-2">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No members in this frequency yet.</div>
        ) : (
          members.map((member) => (
            <Link 
              key={member.id} 
              href={`/profile/${member.id}`} 
              className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded-xl transition-colors"
            >
              <img 
                src={member.avatar} 
                alt={member.name} 
                className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm bg-gray-100"
              />
              <div className="flex flex-col">
                <span className="text-[16px] font-medium text-gray-900 leading-tight mb-0.5">{member.name}</span>
                <span className="text-[14px] text-gray-500">{member.role}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

