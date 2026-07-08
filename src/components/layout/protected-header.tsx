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

        const { data: userRecord } = await supabase
          .from('users')
          .select('onboarded, accountType, profileImage')
          .eq('id', session.user.id)
          .single();

        if (userRecord?.profileImage) {
          setProfilePhoto(userRecord.profileImage);
        }

        const isOnboardingRoute =
          pathname === '/role-selection' ||
          pathname === '/onboarding' ||
          pathname.startsWith('/onboarding-business');

        if (!userRecord?.onboarded && !isOnboardingRoute) {
          if (userRecord?.accountType === 'business') {
            router.push("/onboarding-business");
            return;
          }

          if (userRecord?.accountType === 'flight_crew') {
            router.push("/onboarding");
            return;
          }

          router.push("/role-selection");
        }
      } catch (e) {
        console.error("Failed to fetch profile", e);
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
