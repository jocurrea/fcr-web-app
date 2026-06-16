"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResumePreviewPage() {
  const router = useRouter();
  const [personal, setPersonal] = useState<any>({});
  const [resume, setResume] = useState<any>({});
  const [profilePhoto, setProfilePhoto] = useState<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPersonal = localStorage.getItem("onboarding_personal");
      if (savedPersonal) {
        setPersonal(JSON.parse(savedPersonal));
      }

      const savedResume = localStorage.getItem("onboarding_resume");
      if (savedResume) {
        setResume(JSON.parse(savedResume));
      }

      const savedPhoto = localStorage.getItem("userProfilePhoto");
      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }

      // Automatically trigger print dialog when component is mounted and data is loaded
      // setTimeout(() => window.print(), 1000);
    }
  }, []);

  const fullName = `${personal.firstName || "Jose"} ${personal.middleName || ""} ${personal.lastName || "UrrutiaPilot Urrea"}`.trim().replace(/\s+/g, ' ');
  const roleName = personal.role ? personal.role.toUpperCase() : "PILOT";

  return (
    <div className="min-h-screen flex font-sans bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
      
      {/* Left Column */}
      <div className="w-1/3 bg-black text-white px-8 py-16 flex flex-col gap-10">
        
        <div>
          <h2 className="text-[#facc15] font-extrabold text-sm tracking-wider mb-4 uppercase">Contact</h2>
          <div className="text-sm space-y-2 text-gray-200">
            <p>+ {resume.websites?.[0] || "asdasdasd"}</p>
            <p>{resume.websites?.[1] || "asdasd"}</p>
          </div>
        </div>

        <div>
          <h2 className="text-[#facc15] font-extrabold text-sm tracking-wider mb-4 uppercase">Top Skills</h2>
          <div className="text-sm space-y-2 text-gray-200">
            {resume.skills && resume.skills.length > 0 ? (
              resume.skills.map((skill: string, idx: number) => (
                <p key={idx}>{skill}</p>
              ))
            ) : (
              <p>Decision-making</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[#facc15] font-extrabold text-sm tracking-wider mb-4 uppercase">General Information</h2>
          <div className="text-sm space-y-2 text-gray-200 uppercase">
            <p>Married</p>
          </div>
        </div>

        <div>
          <h2 className="text-[#facc15] font-extrabold text-sm tracking-wider mb-4 uppercase">Profile</h2>
          <div className="text-sm space-y-2 text-gray-200">
            <p>Additional details from profile.</p>
          </div>
        </div>

      </div>

      {/* Right Column */}
      <div className="w-2/3 bg-white px-12 py-16 flex flex-col">
        
        {/* Header Block */}
        <div className="flex items-center gap-6 mb-16">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 flex items-center justify-center">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">Photo</span>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">{fullName}</h1>
            <h2 className="text-lg tracking-widest text-black uppercase mb-1">{roleName}</h2>
            <p className="text-gray-500 text-sm">{personal.selectedCountry || "asdasd"}</p>
          </div>
        </div>

        {/* Summary Block */}
        <div>
          <h2 className="text-black font-extrabold text-lg tracking-wide mb-6 uppercase">Summary</h2>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {personal.description || "asdasdasd"}
          </p>
        </div>

      </div>

      {/* Print Button Overlay (Hidden when printing) */}
      <button 
        onClick={() => window.print()} 
        className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl hover:bg-blue-700 print:hidden font-bold transition-transform hover:scale-105 active:scale-95"
      >
        Print / Save PDF
      </button>

    </div>
  );
}
