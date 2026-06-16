"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Upload, ChevronDown, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const MOCK_USERS = [
  { id: "1", name: "Carlos Perez", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "2", name: "Maria Gomez", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: "3", name: "Juan Silva", avatar: "https://randomuser.me/api/portraits/men/22.jpg" },
  { id: "4", name: "Laura Martinez", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
  { id: "5", name: "Diego Lopez", avatar: "https://randomuser.me/api/portraits/men/46.jpg" },
];

export default function NewFrequencyPage() {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [frequencyIcon, setFrequencyIcon] = useState<string | null>(null);
  const [frequencyIconFile, setFrequencyIconFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrequencyIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrequencyIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setFrequencyIcon(null);
    setFrequencyIconFile(null);
  };

  const handleCreateFrequency = async () => {
    if (!name.trim()) {
      alert("Please provide a name for the frequency.");
      return;
    }

    const frequencyName = name.trim();
    
    // Using the new Supabase API
    const { createFrequency } = await import('@/lib/api/frequencies');
    const success = await createFrequency(frequencyName, null, frequencyIconFile || undefined, isPublic);

    if (success) {
      router.push("/frequencies");
    } else {
      alert("Error creating frequency. Please try again.");
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-white min-h-screen z-50 fixed inset-0 md:relative md:inset-auto pb-10 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center py-5 px-4 relative mt-2">
        <Link href="/frequencies" className="p-2.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full shadow-sm">
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </Link>
        <h1 className="flex-1 text-center text-[19px] font-semibold text-gray-800 pr-10">New Frequency</h1>
      </header>

      <div className="px-6 mt-4">
        {/* Toggle Public / Private */}
        <div className="flex bg-[#e2e8f0] rounded-full p-1 mb-8 shadow-inner">
          <button
            className={`flex-1 py-2.5 text-[15px] font-semibold rounded-full transition-all ${
              isPublic ? "bg-[#1a73e8] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setIsPublic(true)}
          >
            Public
          </button>
          <button
            className={`flex-1 py-2.5 text-[15px] font-semibold rounded-full transition-all ${
              !isPublic ? "bg-gray-300 text-gray-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setIsPublic(false)}
          >
            Private
          </button>
        </div>

        {/* Inputs */}
        <div className="mb-6">
          <label className="block text-[14px] text-gray-700 mb-1.5 ml-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-3xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div className="mb-6">
          <label className="block text-[14px] text-gray-700 mb-1.5 ml-1">Personal Description</label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-3xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none text-gray-900"
          ></textarea>
        </div>

        <div className="mb-6">
          <label className="block text-[14px] text-gray-700 mb-1.5 ml-1">Frequency Icon</label>
          {frequencyIcon ? (
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200">
              <img src={frequencyIcon} alt="Uploaded" className="w-full h-full object-cover" />
              <button 
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          ) : (
            <label className="w-full h-32 border border-gray-200 bg-[#f4f4f5] rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 stroke-[1.5]" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        <div className="mb-6" ref={dropdownRef}>
          <label className="block text-[14px] text-gray-700 mb-1.5 ml-1">Invite Members</label>
          <div className="relative">
            <div 
              className="w-full border border-gray-300 rounded-full px-5 py-3 bg-white flex items-center justify-between cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="text-[14px] text-gray-400">
                Search users...
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="mt-2 w-full bg-white rounded-xl shadow-sm border border-gray-200 py-2 max-h-60 overflow-y-auto">
                {MOCK_USERS.map((user) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id) ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      toggleUser(user.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className={`text-[15px] ${selectedUsers.includes(user.id) ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                      {user.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Members List */}
        {selectedUsers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[15px] text-gray-800 mb-3 ml-1">Frequency Members</h3>
            <div className="flex flex-col gap-3">
              {selectedUsers.map(id => {
                const user = MOCK_USERS.find(u => u.id === id);
                if (!user) return null;
                return (
                  <div key={user.id} className="flex items-center gap-3 ml-1">
                    <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-[15px] text-gray-800">{user.name}</span>
                    <button 
                      onClick={() => toggleUser(user.id)}
                      className="text-red-500 hover:text-red-600 transition-colors ml-1"
                    >
                      <XCircle className="w-5 h-5 stroke-[1.5]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button 
          onClick={handleCreateFrequency}
          className="w-full bg-[#1a73e8] hover:bg-blue-700 transition-colors text-white font-bold text-[16px] py-4 rounded-full shadow-md mt-4"
        >
          Create Frequency
        </button>
      </div>
    </div>
  );
}
