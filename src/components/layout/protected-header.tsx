"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Plus, User, Search, Users, Bot, LogOut, Mail, FileText, Lock, ShieldCheck, Ban, Trash2, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchProfileProgress } from "@/lib/profile-progress";
import { NotificationsBell } from "./notifications-bell";

const hasValue = (obj: any) => {
  if (!obj) return false;
  if (Array.isArray(obj)) return obj.length > 0;
  return Object.values(obj).some(val => {
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return val !== null && val !== undefined;
  });
};

export function ProtectedHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileProgress, setProfileProgress] = useState(70);
  const [accountTypeState, setAccountTypeState] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function syncLocalProfileToDatabase(userId: string) {
      try {
        const savedPhoto = localStorage.getItem("userProfilePhoto");
        const savedPersonal = localStorage.getItem("onboarding_personal");
        const localPersonal = savedPersonal ? JSON.parse(savedPersonal) : null;

        // Step 1: Read own users row (RLS always allows reading your own row)
        const { data: dbUser } = await supabase
          .from('users')
          .select('firstName, middleName, lastName, profileImage')
          .eq('id', userId)
          .maybeSingle();

        // Step 2: Merge — prefer localStorage data, fall back to DB data
        const firstName = localPersonal?.firstName || dbUser?.firstName || '';
        const middleName = localPersonal?.middleName || dbUser?.middleName || '';
        const lastName = localPersonal?.lastName || dbUser?.lastName || '';
        const profilePhoto = savedPhoto || dbUser?.profileImage || '';

        if (!firstName && !lastName && !profilePhoto) return;

        // Step 3: Save to users table
        const userPayload: any = { id: userId, onboarded: 1 };
        if (firstName) userPayload.firstName = firstName;
        if (middleName) userPayload.middleName = middleName;
        if (lastName) userPayload.lastName = lastName;
        if (profilePhoto) userPayload.profileImage = profilePhoto;

        const savedLicenses = localStorage.getItem("onboarding_licenses");
        const savedRatings = localStorage.getItem("onboarding_ratings");
        const savedWork = localStorage.getItem("onboarding_work");
        const savedResume = localStorage.getItem("onboarding_resume");

        const localLicenses = savedLicenses ? JSON.parse(savedLicenses) : null;
        const localRatings = savedRatings ? JSON.parse(savedRatings) : null;
        const localWork = savedWork ? JSON.parse(savedWork) : null;
        const localResume = savedResume ? JSON.parse(savedResume) : null;

        // Step 4: Safely merge resumes data so we NEVER wipe out licenses, ratings, work, etc.
        const { data: existingResume } = await supabase
          .from('resumes')
          .select('data')
          .eq('userId', userId)
          .maybeSingle();

        const currentData = (existingResume?.data as any) || {};
        const mergedData = {
          ...currentData,
          personal: {
            ...(currentData.personal || {}),
            ...(localPersonal || {}),
            firstName: firstName || currentData.personal?.firstName,
            middleName: middleName || currentData.personal?.middleName,
            lastName: lastName || currentData.personal?.lastName,
            profilePhoto: profilePhoto || currentData.personal?.profilePhoto
          },
          licenses: (localLicenses && localLicenses.length > 0) ? localLicenses : (currentData.licenses || []),
          ratings: (localRatings && localRatings.length > 0) ? localRatings : (currentData.ratings || []),
          work: localWork || currentData.work || {},
          resume: localResume || currentData.resume || {}
        };

        await Promise.allSettled([
          supabase.from('users').upsert(userPayload, { onConflict: 'id' }),
          supabase.from('resumes').upsert({
            userId: userId,
            data: mergedData
          }, { onConflict: 'userId' })
        ]);
      } catch (e) {
        console.error('[ProtectedHeader] Profile sync error:', e);
      }
    }

    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/welcome");
          return;
        }

        // Always sync local profile to Supabase DB so other users can see name & photo
        syncLocalProfileToDatabase(session.user.id);

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
          setAccountTypeState('flight_crew');
          // Still load the profile photo and progress in background
          supabase.from('users').select('profileImage').eq('id', session.user.id).maybeSingle()
            .then(({ data }) => { 
              if (data?.profileImage) {
                setProfilePhoto(data.profileImage); 
              } else {
                const savedPhoto = localStorage.getItem("userProfilePhoto");
                if (savedPhoto) setProfilePhoto(savedPhoto);
              }
            });

          fetchProfileProgress(session.user.id).then((progress) => setProfileProgress(progress));

          // No need for redirect checks — user is onboarded
          return;
        }

        // ============================================================
        // SLOW PATH: DB queries for users without fast-path signal
        // ============================================================
        try {
          const [userRes, resumeRes] = await Promise.all([
            supabase.from('users').select('onboarded, accountType, profileImage').eq('id', session.user.id).maybeSingle(),
            supabase.from('resumes').select('data').eq('userId', session.user.id).maybeSingle()
          ]);
            
          const userRecord = userRes.data;
          const resumeFallback = resumeRes.data;

          if (userRecord) {
            onboarded = !!userRecord.onboarded;
            accountType = userRecord.accountType || '';
            setAccountTypeState(accountType);
            if (userRecord.profileImage) {
              setProfilePhoto(userRecord.profileImage);
            } else {
              const savedPhoto = localStorage.getItem("userProfilePhoto");
              if (savedPhoto) setProfilePhoto(savedPhoto);
            }
          }

          // Calculate progress using standardized fetchProfileProgress
          const progress = await fetchProfileProgress(session.user.id);
          setProfileProgress(progress);

          if (resumeFallback?.data && !onboarded) {
            accountType = 'flight_crew';
            onboarded = true;
          }
        } catch (e) {
          console.error("Failed to fetch from users/resumes", e);
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
            setAccountTypeState('business');
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

        // localStorage fallback: user filled step 1 but cookie wasn't set
        if (!onboarded && hasLocalStorageLegacy && (pathname === '/home' || pathname.startsWith('/home'))) {
          onboarded = true;
          accountType = 'flight_crew';
          setAccountTypeState('flight_crew');
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

          // Let the user choose if not onboarded, even if DB says flight_crew by default
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
          <NotificationsBell />
          <Link href="/new-post" className="text-gray-600 hover:text-black transition-colors">
            <Plus className="w-[26px] h-[26px]" />
          </Link>
          <div className="relative inline-flex items-center justify-center" style={{ width: '52px', height: '52px' }}>
            {/* SVG Progress Ring - Only for Flight Crew */}
            {accountTypeState === 'flight_crew' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="24" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke={profileProgress === 100 ? "#059669" : "#f97316"}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 - (2 * Math.PI * 24 * profileProgress) / 100}`}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
              </svg>
            )}

            {/* Avatar Button */}
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="rounded-full cursor-pointer overflow-hidden bg-white z-10 hover:opacity-90 transition-opacity"
              style={{ width: '42px', height: '42px', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-gray-500 font-medium bg-gray-100" style={{ fontSize: '10px' }}>
                  Me
                </span>
              )}
            </button>

            {/* Percentage Badge - Only for Flight Crew */}
            {accountTypeState === 'flight_crew' && (
              <div 
                className={`absolute left-1/2 -translate-x-1/2 bg-white px-2 py-[1px] rounded-full text-[10px] font-bold ${profileProgress === 100 ? 'text-[#059669]' : 'text-[#f97316]'} border border-gray-100 shadow-sm z-20`}
                style={{ bottom: '-6px' }}
              >
                {profileProgress}%
              </div>
            )}
          </div>

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
