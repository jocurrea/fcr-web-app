"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const MOCK_MEMBERS = [
  { id: "1", name: "Marcel Castro", role: "Pilot", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "2", name: "Andres Silva", role: "Pilot", avatar: "https://randomuser.me/api/portraits/men/44.jpg" },
  { id: "3", name: "Logged In User", role: "Pilot", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=user" },
];

export default function FrequencyMembersPage() {
  const router = useRouter();

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
        {MOCK_MEMBERS.map((member) => (
          <div key={member.id} className="flex items-center gap-4">
            <img 
              src={member.avatar} 
              alt={member.name} 
              className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-[16px] font-medium text-gray-900 leading-tight mb-0.5">{member.name}</span>
              <span className="text-[14px] text-gray-500">{member.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
