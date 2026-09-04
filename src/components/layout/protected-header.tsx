"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, User, Search, Users, Bot, LogOut, Mail, FileText, Lock, ShieldCheck, Ban, Trash2, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NotificationsBell } from "./notifications-bell";
import { useUserProfile } from "@/components/providers/user-profile-provider";

export function ProtectedHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    profileProgress,
    profilePhoto,
    accountType,
    isBusiness: contextIsBusiness,
    companyStatus,
    userStatus,
    onboarded,
    isLoading,
    refetchProfile,
  } = useUserProfile();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Authentication & Onboarding route guard
  useEffect(() => {
    if (isLoading) return;

    const isOnboardingRoute =
      pathname === "/welcome" ||
      pathname === "/login" ||
      pathname === "/role-selection" ||
      pathname === "/onboarding" ||
      pathname.startsWith("/onboarding-business");

    if (!onboarded && !isOnboardingRoute) {
      if (accountType === "business" || contextIsBusiness) {
        router.push("/onboarding-business");
        return;
      }
      router.push("/role-selection");
    }
  }, [isLoading, onboarded, pathname, router, accountType, contextIsBusiness]);

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

  const effectiveAccountType =
    accountType ||
    (typeof window !== "undefined"
      ? localStorage.getItem("account_type") || localStorage.getItem("accountType")
      : "") ||
    "";

  const isBusiness =
    contextIsBusiness ||
    effectiveAccountType === "business" ||
    pathname.startsWith("/business") ||
    pathname.startsWith("/onboarding-business");

  // Architecture Rule: Business accounts do not use profile completion percentages.
  // Percentage weights only apply to individual professional roles.
  // Only display the ring for flight_crew / aviation_professional; completely hide percentage text and ring for business.
  const showProgressRing =
    !isBusiness &&
    (effectiveAccountType === "flight_crew" ||
      effectiveAccountType === "aviation_professional" ||
      (!effectiveAccountType && !pathname.startsWith("/business")));

  const effectiveAvatarPhoto =
    profilePhoto ||
    (typeof window !== "undefined"
      ? localStorage.getItem("userProfilePhoto")
      : null);

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
          {/* Avatar with Circular Green Progress Ring and Percentage Below (Only for flight_crew) */}
          <div className="relative flex flex-col items-center justify-center shrink-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="relative cursor-pointer group flex flex-col items-center justify-center focus:outline-none"
              title={isBusiness ? "Company Profile" : "Profile"}
            >
              {isLoading ? (
                /* Loading State: Display avatar with subtle spinner ring without rendering intermediate/default numbers */
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full border-2 border-gray-200 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-[3.5px] rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {effectiveAvatarPhoto ? (
                      <img 
                        src={effectiveAvatarPhoto} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 animate-pulse" />
                    )}
                  </div>
                </div>
              ) : showProgressRing ? (
                <>
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    {/* SVG Green Progress Ring */}
                    <svg className="w-11 h-11 -rotate-90 pointer-events-none" viewBox="0 0 44 44">
                      {/* Track */}
                      <circle
                        cx="22"
                        cy="22"
                        r="19"
                        className="text-gray-200"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        fill="none"
                      />
                      {/* Progress Arc in Green */}
                      <circle
                        cx="22"
                        cy="22"
                        r="19"
                        className="text-emerald-500 transition-all duration-500 ease-out"
                        strokeWidth="2.5"
                        strokeDasharray={2 * Math.PI * 19}
                        strokeDashoffset={2 * Math.PI * 19 - (2 * Math.PI * 19 * Math.min(100, Math.max(0, profileProgress))) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                      />
                    </svg>

                    {/* Avatar Photo */}
                    <div className="absolute inset-[3.5px] rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {effectiveAvatarPhoto ? (
                        <img 
                          src={effectiveAvatarPhoto} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[#1d4ed8] font-extrabold bg-blue-50 text-xs">
                          A
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Percentage text in small size & green centered directly below the avatar ring */}
                  <span className="text-[10px] font-extrabold text-emerald-600 leading-none mt-0.5 tracking-tight">
                    {Math.min(100, Math.max(0, profileProgress))}%
                  </span>
                </>
              ) : (
                /* Business Account: Clean Avatar without percentage text or progress ring */
                <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shadow-2xs hover:border-gray-300 transition-all">
                  {effectiveAvatarPhoto ? (
                    <img 
                      src={effectiveAvatarPhoto} 
                      alt="Company Logo" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-gray-700 font-bold bg-gray-100 text-sm">
                      B
                    </span>
                  )}
                </div>
              )}
            </button>
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
