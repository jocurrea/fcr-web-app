"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center p-6">
      
      {/* Central Content Block */}
      <div className="w-full flex flex-col items-center mt-[-20px]">
        
        {/* Logo */}
        <img 
          src="/logo-vertical.png" 
          alt="Flight Crew Ranked" 
          className="w-[260px] object-contain mb-16" 
        />

        {/* Text Section */}
        <div className="flex flex-col items-center w-[640px] max-w-[95vw] mb-20 px-4">
          <div className="inline-block bg-[#1a73e8] text-white text-[14px] font-bold px-4 py-1.5 rounded mb-4">
            Flight Crew Staging
          </div>
          <p className="text-[#333333] text-[17px] leading-[1.6] text-justify w-full">
            A social platform for pilots, crew members and enthusiasts that want to improve their professional life. Created by pilots and crewmembers who understand the community.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="w-[640px] max-w-[95vw] flex flex-col gap-5 mb-10 px-4">
          <button 
            onClick={() => router.push("/register")}
            className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-[18px] py-4 rounded-full transition-colors"
          >
            Create an account
          </button>
          
          <button className="w-full bg-white border border-[#1a73e8] text-[#1a73e8] font-bold text-[16px] py-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with google
          </button>
        </div>

        {/* Footer Section */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-center">
            <span className="text-sm text-gray-500">Already have an account! </span>
            <Link href="/login" className="text-sm text-[#0f172a] font-bold hover:underline">
              Login
            </Link>
          </div>
          <div className="flex justify-center items-center gap-2 text-xs text-gray-400 mt-2">
            <Link href="#" className="hover:underline">Terms & Conditions</Link>
            <span>|</span>
            <Link href="#" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
