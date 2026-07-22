"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, MoreHorizontal, Users, BellOff, Bell, LogOut } from "lucide-react";

export default function FrequenciesPage() {
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [frequencies, setFrequencies] = useState<any[]>([]);
  const [mutedFrequencies, setMutedFrequencies] = useState<string[]>([]);
  const [frequencyToLeave, setFrequencyToLeave] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFrequencies() {
      const { fetchJoinedFrequencies } = await import('@/lib/api/frequencies');
      const data = await fetchJoinedFrequencies();
      setFrequencies(data);
      setLoading(false);
    }
    loadFrequencies();

    const muted = JSON.parse(localStorage.getItem("muted_frequencies") || "[]");
    setMutedFrequencies(muted);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mainRef.current && !mainRef.current.contains(event.target as Node)) {
        setIsMainMenuOpen(false);
      }
      const target = event.target as Element;
      if (!target.closest('.item-menu-container')) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInitiateLeave = (freq: any) => {
    setFrequencyToLeave(freq);
    setActiveMenuId(null);
  };

  const confirmLeave = async () => {
    if (!frequencyToLeave) return;
    
    const { leaveFrequency } = await import('@/lib/api/frequencies');
    const success = await leaveFrequency(frequencyToLeave.id);
    
    if (success) {
      const updated = frequencies.filter(f => f.id !== frequencyToLeave.id);
      setFrequencies(updated);
      setFrequencyToLeave(null);
    } else {
      alert("Error leaving frequency.");
      setFrequencyToLeave(null);
    }
  };

  const toggleMute = (id: string) => {
    let updatedMuted;
    if (mutedFrequencies.includes(id)) {
      updatedMuted = mutedFrequencies.filter(fId => fId !== id);
    } else {
      updatedMuted = [...mutedFrequencies, id];
    }
    setMutedFrequencies(updatedMuted);
    localStorage.setItem("muted_frequencies", JSON.stringify(updatedMuted));
    setActiveMenuId(null);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full px-8 pt-8 min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative" ref={mainRef}>
        <h1 className="text-[22px] font-medium text-gray-800">Frequencies</h1>
        <button onClick={() => setIsMainMenuOpen(!isMainMenuOpen)} className="p-1">
          <Menu className="w-6 h-6 text-gray-800" />
        </button>

        {/* Main Dropdown */}
        {isMainMenuOpen && (
          <div className="absolute top-10 right-0 w-60 bg-white rounded-xl shadow-md border border-gray-200 py-3 z-50">
            <Link href="/frequencies/new" className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-gray-800 text-[15px] font-medium">
              <Users className="w-5 h-5 text-gray-500" /> Create Frequency
            </Link>
            <Link href="/frequencies/available" className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-gray-800 text-[15px] font-medium">
              <Users className="w-5 h-5 text-gray-500" /> Available Frequencies
            </Link>
          </div>
        )}
      </div>

      {/* Frequency List */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : frequencies.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">You haven't joined any frequencies yet.</p>
        ) : (
          frequencies.map((freq) => (
            <div key={freq.id} className="item-menu-container flex items-center justify-between w-full relative hover:bg-gray-50 transition-colors p-2 -mx-2 rounded-xl">
              <Link href={`/frequencies/${freq.id}`} className="flex items-center gap-4 flex-1 cursor-pointer">
                {freq.image ? (
                  <img src={freq.image} alt={freq.name} className="w-[52px] h-[52px] rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-full bg-[#cbd5e1] overflow-hidden flex items-center justify-center opacity-80" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
                )}
                <span className="text-[17px] text-gray-800 font-medium tracking-wide">{freq.name}</span>
              </Link>

              <div className="flex items-center">
                {mutedFrequencies.includes(freq.id) && (
                  <BellOff className="w-5 h-5 text-red-500 mr-4" />
                )}
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-600 text-blue-600 bg-white shadow-sm transition-transform active:scale-95"
                  onClick={() => setActiveMenuId(activeMenuId === freq.id ? null : freq.id)}
                >
                  <MoreHorizontal className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Item Dropdown */}
              {activeMenuId === freq.id && (
                <div className="absolute top-10 right-0 w-56 bg-white rounded-xl shadow-md border border-gray-200 py-2 z-50">
                  <button 
                    className="flex items-center w-full gap-3 px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium text-[15px]" 
                    onClick={() => toggleMute(freq.id)}
                  >
                    {mutedFrequencies.includes(freq.id) ? (
                      <>
                        <Bell className="w-5 h-5 text-gray-700" /> Enable notifications
                      </>
                    ) : (
                      <>
                        <BellOff className="w-5 h-5 text-gray-700" /> Disable notifications
                      </>
                    )}
                  </button>
                  <button 
                    className="flex items-center w-full gap-3 px-4 py-3 hover:bg-red-50 text-[#ef4444] font-medium text-[15px]"
                    onClick={() => handleInitiateLeave(freq)}
                  >
                    <LogOut className="w-5 h-5" /> Leave Frequency
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Leave Frequency Modal */}
      {frequencyToLeave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Leave Frequency?</h2>
            <p className="text-[15px] text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to leave {frequencyToLeave.name}? You won't be able to post into this frequency or see any of its posts.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setFrequencyToLeave(null)}
                className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLeave}
                className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-sm"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
