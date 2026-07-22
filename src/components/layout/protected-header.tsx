"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Plus, User, Search, Users, Bot, LogOut, Mail, FileText, Lock, ShieldCheck, Ban, Trash2, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ProtectedHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/welcome");
          return;
        }

        let onboarded = false;
        let accountType = '';

        // ============================================================
        // FAST PATH: Check client-side signals FIRST (no DB needed)
        // These are set by ResumeStep when user clicks Finish
        // ============================================================
        const hasCookie = typeof document !== 'undefined' && document.cookie.includes('flightcrew_onboarded=true');
        const hasMetadata = session.user.user_metadata?.onboarded === true && session.user.user_metadata?.accountType === 'flight_crew';
        const hasLocalStorageLegacy = typeof window !== 'undefined' && !!localStorage.getItem('onboarding_personal');
        const hasSessionStorage = typeof window !== 'undefined' && sessionStorage.getItem('flightcrew_onboarded') === 'true';
        const hasLocalStorageNew = typeof window !== 'undefined' && localStorage.getItem('flightcrew_onboarded') === 'true';

        console.log('[ProtectedHeader] Fast path checks:', { hasCookie, hasMetadata, hasLocalStorageLegacy, hasSessionStorage, hasLocalStorageNew, pathname });

        if (hasCookie || hasMetadata || hasSessionStorage || hasLocalStorageNew) {
          onboarded = true;
          accountType = 'flight_crew';
          // Still load the profile photo in background
          supabase.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle()
            .then(({ data }) => { 
              if (data?.avatar_url) {
                setProfilePhoto(data.avatar_url); 
              } else {
                const savedPhoto = localStorage.getItem("userProfilePhoto");
                if (savedPhoto) setProfilePhoto(savedPhoto);
              }
            });
          // No need for redirect checks — user is onboarded
          return;
        }

        // ============================================================
        // SLOW PATH: DB queries for users without fast-path signal
        // ============================================================
        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('onboarded, accountType')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (userRecord) {
            onboarded = !!userRecord.onboarded;
            accountType = userRecord.accountType || '';
          }

          const { data: profileRecord } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileRecord?.avatar_url) {
            setProfilePhoto(profileRecord.avatar_url);
          } else {
            const savedPhoto = localStorage.getItem("userProfilePhoto");
            if (savedPhoto) setProfilePhoto(savedPhoto);
          }
        } catch (e) {
          console.error("Failed to fetch from users/profiles", e);
        }

        // Fallback: If the database trigger failed to create the users row, check if they have a company
        // Also use this query to fetch the logo_url if they are a business
        let companyLogo = null;
        if (!onboarded || accountType === 'business') {
          const { data: companies } = await supabase
            .from('companies')
            .select('status, logo_url')
            .eq('owner_user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (companies && companies.length > 0) {
            accountType = 'business';
            const status = companies[0].status;
            if (status === 'approved' || status === 'pending') {
              onboarded = true;
            }
            if (companies[0].logo_url) {
              companyLogo = companies[0].logo_url;
            }
          }
        }
        
        if (companyLogo) {
          setProfilePhoto(companyLogo);
        }

        // Check profiles table for crew_data (proves they finished flight crew)
        if (!onboarded) {
          const { data: profileFallback } = await supabase
            .from('profiles')
            .select('crew_data')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileFallback?.crew_data) {
            accountType = 'flight_crew';
            onboarded = true;
          }
        }

        // localStorage fallback: user filled step 1 but cookie wasn't set
        if (!onboarded && hasLocalStorageLegacy && (pathname === '/home' || pathname.startsWith('/home'))) {
          onboarded = true;
          accountType = 'flight_crew';
        }

        console.log('[ProtectedHeader] DB path result:', { onboarded, accountType });

        const isOnboardingRoute =
          pathname === '/role-selection' ||
          pathname === '/onboarding' ||
          pathname.startsWith('/onboarding-business');

        if (!onboarded && !isOnboardingRoute) {
          if (accountType === 'business') {
            router.push("/onboarding-business");
            return;
          }

          if (accountType === 'flight_crew') {
            router.push("/onboarding");
            return;
          }

          router.push("/role-selection");
        }
      } catch (e) {
        console.error("Failed to load session/profile", e);
      }
    }

    loadProfile();
  }, [pathname, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteAccount = () => {
    setIsDropdownOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Call the secure RPC function to delete the user from auth.users
        const { error } = await supabase.rpc('delete_user');
        if (error) throw error;
        
        await supabase.auth.signOut();
      }
      localStorage.clear();
      router.push("/welcome");
    } catch (e) {
      console.error("Failed to delete account", e);
      alert("There was an error deleting your account. Please try again.");
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear current user id to switch sessions
      localStorage.removeItem("current_user_id");
      
      router.push("/welcome");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (pathname === "/notifications" || pathname === "/newEmail" || pathname === "/resume-preview" || pathname === "/termsAndConditions" || pathname === "/privacyPolicy" || pathname === "/community-safety" || pathname === "/blockedUsers" || pathname.startsWith("/post/")) {
    return null; // Hide the top header on these specific detail pages
  }

  return (
    <>
    <header className="sticky top-0 z-50 bg-[#f8f9fa] pt-6 pb-2"> {/* Match grey background from screenshot */}
      <div className="mx-auto flex h-16 w-full max-w-lg items-center px-4 sm:px-0">
        {/* Left Logo */}
        <Link href="/home">
          <img src="/flight-crew-logo.png" alt="Flight Crew" className="h-[52px] object-contain" />
        </Link>
        
        {/* Right side icons */}
        <div className="ml-auto flex items-center gap-5 relative" ref={dropdownRef}>
          <Link href="/notifications" className="text-gray-600 hover:text-black transition-colors">
            <Bell className="w-5 h-5" />
          </Link>
          <Link href="/new-post" className="text-gray-600 hover:text-black transition-colors">
            <Plus className="w-[26px] h-[26px]" />
          </Link>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 p-[2px] bg-white cursor-pointer"
          >
            {profilePhoto ? (
              <img 
                src={profilePhoto} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover" 
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                Me
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            pathname === '/profile' ? (
              <div className="absolute top-full right-0 mt-3 w-64 bg-[#f8f9fa] rounded-2xl shadow-xl border border-gray-200 py-3 z-50 flex flex-col gap-1.5">
                <Link href="/newEmail" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <Mail className="w-[18px] h-[18px]" /> Change email
                </Link>
                <Link href="/resume-preview" target="_blank" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <FileDown className="w-[18px] h-[18px]" /> Download resume
                </Link>
                <Link href="/termsAndConditions" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <FileText className="w-[18px] h-[18px]" /> Terms & Conditions
                </Link>
                <Link href="/privacyPolicy" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <Lock className="w-[18px] h-[18px]" /> Privacy Policy
                </Link>
                <Link href="/community-safety" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <ShieldCheck className="w-[18px] h-[18px]" /> Community Guidelines
                </Link>
                <Link href="/blockedUsers" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <Ban className="w-[18px] h-[18px]" /> Blocked Users
                </Link>
                <Link href="/search" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <Search className="w-[18px] h-[18px]" /> Search People
                </Link>
                <Link href="/frequencies" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <Users className="w-[18px] h-[18px]" /> Frequencies
                </Link>
                <Link href="/copilot" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-1.5 hover:bg-gray-100 text-gray-800 text-[15px] font-medium transition-colors">
                  <Bot className="w-[18px] h-[18px]" /> AI Copilot
                </Link>
                
                <button 
                  onClick={handleDeleteAccount}
                  className="flex items-center gap-3 px-5 py-1.5 hover:bg-red-50 text-[#ef4444] text-[15px] font-medium transition-colors text-left mt-1"
                >
                  <Trash2 className="w-[18px] h-[18px]" /> Delete Account
                </button>

                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-5 py-1.5 hover:bg-red-50 text-[#ef4444] text-[15px] font-medium transition-colors text-left"
                >
                  <LogOut className="w-[18px] h-[18px]" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 flex flex-col gap-1">
                <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 text-[15px] font-medium mx-1 rounded-lg transition-colors">
                  <User className="w-5 h-5" /> Profile
                </Link>
                <Link href="/search" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 text-[15px] font-medium mx-1 rounded-lg transition-colors">
                  <Search className="w-5 h-5" /> Search People
                </Link>
                <Link href="/frequencies" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 text-[15px] font-medium mx-1 rounded-lg transition-colors">
                  <Users className="w-5 h-5" /> Frequencies
                </Link>
                <Link href="/copilot" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 text-[15px] font-medium mx-1 rounded-lg transition-colors">
                  <Bot className="w-5 h-5" /> AI Copilot
                </Link>
                
                <div className="h-px bg-gray-100 my-1 mx-4" />
                
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-[#ef4444] text-[15px] font-medium mx-1 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
      
      {/* Custom Delete Account Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1a1b1e] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-800">
            <h3 className="text-white font-semibold text-[17px] mb-2">Delete Account</h3>
            <p className="text-gray-300 text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-[#bfd4f6] text-[#00388d] font-semibold text-[14px] hover:bg-[#a6c3ef] transition-colors border-2 border-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-[#0051ba] text-white font-semibold text-[14px] hover:bg-[#004299] transition-colors"
              >
                {isDeleting ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
