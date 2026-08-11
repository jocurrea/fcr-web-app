"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Upload, ChevronDown, XCircle, Info, X, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

type DBUser = {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  profileImage: string | null;
};

export default function NewFrequencyPage() {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyIcon, setFrequencyIcon] = useState<string | null>(null);
  const [frequencyIconFile, setFrequencyIconFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isCompanyPending, setIsCompanyPending] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCompanyStatus() {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: companies } = await supabase
          .from('companies')
          .select('status')
          .eq('owner_user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (companies && companies.length > 0 && companies[0].status === 'pending') {
          setIsCompanyPending(true);
        }
      }
    }
    async function loadUsers() {
      const { supabase } = await import('@/lib/supabase');
      const [{ data: usersData }, { data: companiesData }] = await Promise.all([
        supabase.from('users').select('id, firstName, lastName, username, profileImage, accountType').limit(100),
        supabase.from('companies').select('owner_user_id, name, logo_url')
      ]);

      const companyMap = new Map((companiesData || []).map(c => [c.owner_user_id, c]));

      if (usersData) {
        const resolvedUsers = usersData.map(u => {
          const comp = companyMap.get(u.id);
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          const displayName = comp?.name || fullName || u.username || 'User';
          const avatar = comp?.logo_url || u.profileImage || '';
          return {
            id: u.id,
            firstName: displayName,
            lastName: '',
            name: displayName,
            profileImage: avatar,
          };
        }).filter(u => u.name && u.name.trim() !== '');

        setUsers(resolvedUsers);
      }
    }
    loadCompanyStatus();
    loadUsers();
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
      if (file.size > 1.9 * 1024 * 1024) {
        alert("El archivo excede el límite de 2MB. (File exceeds 2MB limit)");
        e.target.value = "";
        return;
      }
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
    if (isSubmitting) return;
    if (isCompanyPending) {
      setShowPendingModal(true);
      return;
    }
    if (!name.trim()) {
      setErrorToast("Please provide a name for the frequency.");
      return;
    }
    
    if (selectedUsers.length === 0) {
      setErrorToast("Please invite at least 1 frequency member");
      return;
    }

    const frequencyName = name.trim();
    setIsSubmitting(true);
    
    try {
      // Using the new Supabase API
      const { createFrequency } = await import('@/lib/api/frequencies');
      const result = await createFrequency(frequencyName, description.trim() || null, frequencyIconFile || undefined, isPublic, selectedUsers);

      if (result.success) {
        router.push("/frequencies");
      } else {
        setErrorToast(result.error || "Error creating frequency. Please try again.");
        setIsSubmitting(false);
      }
    } catch (e: any) {
      setErrorToast(e?.message || "Error creating frequency. Please try again.");
      setIsSubmitting(false);
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
        {isCompanyPending && (
          <div className="bg-[#f0f6ff] border border-[#e0eaff] p-5 rounded-[16px] flex items-start gap-4 w-full mb-6">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Clock className="w-[22px] h-[22px] text-[#1a56db]" strokeWidth={2.5} />
            </div>
            <div className="mt-0.5">
              <h3 className="font-bold text-[16px] text-gray-900 mb-1.5">Company profile under review</h3>
              <p className="text-[14.5px] text-gray-500 leading-relaxed pr-2">
                Posting, commenting, liking, and creating Frequencies are disabled until your company is approved.
              </p>
            </div>
          </div>
        )}

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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              className="w-full border border-gray-300 rounded-full px-5 py-3 bg-white flex items-center justify-between cursor-text"
              onClick={() => setIsDropdownOpen(true)}
            >
              <input 
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[14px] text-gray-800 focus:outline-none bg-transparent"
              />
              <ChevronDown className="w-5 h-5 text-gray-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }} />
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="mt-2 w-full bg-white rounded-xl shadow-sm border border-gray-200 py-2 max-h-60 overflow-y-auto">
                {users.filter(u => (u.name || u.firstName).toLowerCase().includes(searchQuery.toLowerCase())).map((user) => {
                  const displayName = user.name || user.firstName;
                  return (
                    <div 
                      key={user.id} 
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id) ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        toggleUser(user.id);
                        setSearchQuery("");
                        setIsDropdownOpen(false);
                      }}
                    >
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs uppercase shadow-sm">
                          {displayName[0] || 'U'}
                        </div>
                      )}
                      <span className={`text-[15px] ${selectedUsers.includes(user.id) ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                        {displayName}
                      </span>
                    </div>
                  );
                })}
                {users.filter(u => (u.name || u.firstName).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">No users found</div>
                )}
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
                const user = users.find(u => u.id === id);
                if (!user) return null;
                const displayName = user.name || user.firstName;
                return (
                  <div key={user.id} className="flex items-center gap-3 ml-1">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={displayName} className="w-7 h-7 rounded-full object-cover shrink-0 bg-gray-100 border border-gray-200" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs uppercase shadow-sm">
                        {displayName[0] || 'U'}
                      </div>
                    )}
                    <span className="text-[15px] text-gray-800">{displayName}</span>
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
          disabled={isSubmitting}
          className={`w-full bg-[#1a73e8] hover:bg-blue-700 transition-colors text-white font-bold text-[16px] py-4 rounded-full shadow-md mt-4 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Frequency...</span>
            </>
          ) : (
            "Create Frequency"
          )}
        </button>
      </div>

      {showPendingModal && (
        <div className="fixed top-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-[100]">
          <div className="bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 p-5 relative">
            <button onClick={() => setShowPendingModal(false)} className="absolute top-5 right-5 text-gray-800 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-3">
              <Info className="w-[22px] h-[22px] text-[#1a73e8] shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="flex-1 pr-6">
                <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">Company profile under review</h3>
                <p className="text-[14px] text-gray-600 leading-snug">
                  Your company profile is being reviewed. Posting, commenting, liking, and creating Frequencies are disabled until approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification (Rendered at end of DOM to prevent z-index issues) */}
      {errorToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-white rounded-full shadow-2xl border border-gray-200 p-3 pr-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-red-500">
              <XCircle className="w-7 h-7" strokeWidth={2} />
            </div>
            <p className="text-gray-800 font-medium text-[14px] leading-snug">{errorToast}</p>
          </div>
          <button onClick={() => setErrorToast(null)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
