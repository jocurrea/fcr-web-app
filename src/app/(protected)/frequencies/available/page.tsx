"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AvailableFrequenciesPage() {
  const router = useRouter();
  const [frequencies, setFrequencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFrequencies() {
      const { fetchAvailableFrequencies } = await import('@/lib/api/frequencies');
      const data = await fetchAvailableFrequencies();
      setFrequencies(data);
      setLoading(false);
    }
    loadFrequencies();
  }, []);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    const { joinFrequency } = await import('@/lib/api/frequencies');
    const success = await joinFrequency(id);
    
    if (success) {
      router.push(`/frequencies/${id}`);
    } else {
      alert("Error joining frequency. Please try again.");
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full px-8 pt-8 min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center justify-center mb-8 relative">
        <Link href="/frequencies" className="absolute left-0 p-1.5 bg-[#f1f5f9] rounded-full">
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </Link>
        <h1 className="text-[17px] font-semibold text-gray-800">Available Frequencies</h1>
      </div>

      {/* List */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : frequencies.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No available frequencies found.</p>
        ) : (
          frequencies.map((freq) => (
            <div key={freq.id} className="flex items-center justify-between w-full relative">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {freq.image ? (
                  <img src={freq.image} alt={freq.name} className="w-[52px] h-[52px] rounded-full object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-full bg-[#cbd5e1] overflow-hidden flex items-center justify-center opacity-80 shrink-0" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] text-gray-800 font-medium tracking-wide truncate">{freq.name}</span>
                  {freq.isBusiness && (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 mt-1 bg-gray-100/90 border border-gray-200/80 rounded-full w-fit">
                      <Building2 className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                      <span className="text-[12px] font-medium text-gray-700 leading-none">Business</span>
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => handleJoin(freq.id)}
                disabled={joiningId === freq.id}
                className="text-[#1a73e8] font-medium text-[15px]"
              >
                {joiningId === freq.id ? 'Joining...' : 'Join'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
