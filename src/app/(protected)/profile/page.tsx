"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/home/post-card";
import { MapPin, Pencil } from "lucide-react";
import Link from "next/link";

const MOCK_POSTS = [
  {
    id: "1",
    user: {
      name: "asdasd asdasd asdasd",
      avatar: "https://i.pravatar.cc/150?img=33", // Usually would be user's actual photo
    },
    date: "May 30",
    content: "Hello",
    image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&q=80", // placeholder chicken
    likes: 1,
    comments: 1,
  },
  {
    id: "2",
    user: {
      name: "Andres Silva",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
    },
    date: "May 20",
    content: "Test photo3",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80", // placeholder desk man
    likes: 0,
    comments: 0,
  }
];

export default function ProfilePage() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  const [personal, setPersonal] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [work, setWork] = useState<any>(null);
  const [languages, setLanguages] = useState<{name: string, proficiency: string}[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);

  useEffect(() => {
    const savedPhoto = localStorage.getItem("userProfilePhoto");
    if (savedPhoto) {
      setProfilePhoto(savedPhoto);
      // Update mock posts with the user's uploaded photo for realism
      MOCK_POSTS[0].user.avatar = savedPhoto;
    }

    const savedPersonal = localStorage.getItem("onboarding_personal");
    if (savedPersonal) setPersonal(JSON.parse(savedPersonal));

    const savedLicenses = localStorage.getItem("onboarding_licenses");
    if (savedLicenses) setLicenses(JSON.parse(savedLicenses));

    const savedRatings = localStorage.getItem("onboarding_ratings");
    if (savedRatings) setRatings(JSON.parse(savedRatings));

    const savedWork = localStorage.getItem("onboarding_work");
    if (savedWork) setWork(JSON.parse(savedWork));

    const savedResume = localStorage.getItem("onboarding_resume");
    if (savedResume) {
      const parsedResume = JSON.parse(savedResume);
      setResume(parsedResume);
      if (parsedResume.languages) setLanguages(parsedResume.languages);
    }
    
    // Load User Posts from Supabase
    async function loadUserPosts() {
      const { fetchPosts } = await import("@/lib/api/posts");
      const { supabase } = await import("@/lib/supabase");
      const { data: userData } = await supabase.auth.getUser();
      
      const allPosts = await fetchPosts();
      if (userData?.user) {
        setUserPosts(allPosts.filter(p => p.user_id === userData.user.id));
      }
    }
    loadUserPosts();

  }, []);

  const COUNTRIES = [
    { id: "ar", label: "AR Argentina" }, { id: "au", label: "AU Australia" }, { id: "at", label: "AT Austria" },
    { id: "bh", label: "BH Bahrain" }, { id: "bd", label: "BD Bangladesh" }, { id: "be", label: "BE Belgium" },
    { id: "br", label: "BR Brazil" }, { id: "ca", label: "CA Canada" }, { id: "cl", label: "CL Chile" },
    { id: "cn", label: "CN China" }, { id: "co", label: "CO Colombia" }, { id: "cz", label: "CZ Czech Republic" },
    { id: "dk", label: "DK Denmark" }, { id: "eg", label: "EG Egypt" }, { id: "fi", label: "FI Finland" },
    { id: "fr", label: "FR France" }, { id: "de", label: "DE Germany" }, { id: "gr", label: "GR Greece" },
    { id: "hu", label: "HU Hungary" }, { id: "in", label: "IN India" }, { id: "id", label: "ID Indonesia" },
    { id: "ie", label: "IE Ireland" }, { id: "il", label: "IL Israel" }, { id: "it", label: "IT Italy" },
    { id: "jp", label: "JP Japan" }, { id: "ke", label: "KE Kenya" }, { id: "kw", label: "KW Kuwait" },
    { id: "my", label: "MY Malaysia" }, { id: "mx", label: "MX Mexico" }, { id: "np", label: "NP Nepal" },
    { id: "nl", label: "NL Netherlands" }, { id: "nz", label: "NZ New Zealand" }, { id: "ng", label: "NG Nigeria" },
    { id: "no", label: "NO Norway" }, { id: "om", label: "OM Oman" }, { id: "pk", label: "PK Pakistan" },
    { id: "pe", label: "PE Peru" }, { id: "ph", label: "PH Philippines" }, { id: "pl", label: "PL Poland" },
    { id: "pt", label: "PT Portugal" }, { id: "qa", label: "QA Qatar" }, { id: "ro", label: "RO Romania" },
    { id: "ru", label: "RU Russia" }, { id: "sa", label: "SA Saudi Arabia" }, { id: "sg", label: "SG Singapore" },
    { id: "za", label: "ZA South Africa" }, { id: "kr", label: "KR South Korea" }, { id: "es", label: "ES Spain" },
    { id: "lk", label: "LK Sri Lanka" }, { id: "se", label: "SE Sweden" }, { id: "ch", label: "CH Switzerland" },
    { id: "th", label: "TH Thailand" }, { id: "tr", label: "TR Turkey" }, { id: "ae", label: "AE United Arab Emirates" },
    { id: "gb", label: "GB United Kingdom" }, { id: "us", label: "US United States" }, { id: "ve", label: "VE Venezuela" },
    { id: "vn", label: "VN Vietnam" }
  ];

  const fullName = personal ? `${personal.firstName || ""} ${personal.middleName || ""} ${personal.lastName || ""}`.trim().replace(/\s+/g, ' ') : "asdasd asdasd asdasd";
  const description = personal?.description || "Testasdasd";
  const rawCountry = personal?.selectedCountry || "br";
  const country = COUNTRIES.find(c => c.id === rawCountry)?.label.split(" ")[1] || "Brazil";
  
  const commandTypeLabel = work?.commandType === "sic" ? "Second in Command" : "Pilot in Command";
  const flightHours = work?.flightHours || "0";
  const medicalClass = work?.medicalClass || "1st";
  
  const website = resume?.websites?.[0] || "";
  const skills = resume?.skills || [];

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen">
      
      {/* Cover Photo */}
      <div className="h-[280px] w-full relative overflow-hidden bg-gray-50 flex items-center justify-center rounded-b-3xl shadow-sm">
         {profilePhoto ? (
           <img src={profilePhoto} alt="Cover" className="w-full h-full object-cover blur-lg opacity-80 scale-110" />
         ) : (
           <div className="w-full h-full bg-gradient-to-br from-green-100 to-yellow-50" />
         )}
      </div>

      {/* Avatar Container - Overlaps cover */}
      <div className="w-full flex justify-center -mt-20 relative z-10">
        <div className="relative">
          <div className="w-36 h-36 rounded-full overflow-hidden border-[4px] border-[#f8f9fa] bg-[#f8f9fa]">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            )}
          </div>
          {/* Edit Icon */}
          <Link href="/onboarding" className="absolute bottom-1 right-1 w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer z-20">
            <Pencil className="w-[16px] h-[16px]" />
          </Link>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-6 px-6 flex flex-col w-full">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col items-start pt-1">
            <h1 className="text-[26px] font-extrabold text-[#1f2937] leading-none">{fullName || "User Name"}</h1>
            {description && <p className="text-[15px] text-[#4b5563] mt-1">{description}</p>}
          </div>
          
          {/* Badge - Pilot In Command */}
          <div className="flex flex-col items-center">
            <div className="bg-black rounded-md p-2 flex items-center shadow-md border border-gray-800">
              <div className="flex gap-[4px]">
                <div className="w-2.5 h-8 bg-[#fbbf24] rounded-sm"></div>
                <div className="w-2.5 h-8 bg-[#fbbf24] rounded-sm"></div>
                <div className="w-2.5 h-8 bg-[#fbbf24] rounded-sm"></div>
                <div className="w-2.5 h-8 bg-[#fbbf24] rounded-sm"></div>
              </div>
              <div className="ml-3 mr-1 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#fbbf24] fill-[#fbbf24]" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
            </div>
            <span className="text-[10px] text-gray-600 font-semibold tracking-wide mt-1">{commandTypeLabel}</span>
          </div>
        </div>

        {/* Rank Badge */}
        <div className="mt-8 flex flex-col items-center">
          <img src="/silver.png" alt="Silver Rank" className="w-[360px] h-auto object-contain" />

          <span className="text-[16px] font-bold text-[#4b5563] mt-2">Silver</span>
          
          <div className="mt-4 flex flex-col items-center">
            <span className="text-[24px] font-bold text-[#1f2937] leading-none">{flightHours}</span>
            <span className="text-[14px] text-gray-500 mt-1 font-medium">Flight Hours</span>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="mt-8 px-4 text-left w-full flex flex-col gap-6">
        
        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-gray-800 font-medium">
            <MapPin className="w-[16px] h-[16px] text-gray-600" />
            <span className="text-[14px] uppercase">{country}</span>
          </div>
          {website && <a href={website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-[14px] font-medium ml-[22px]">{website}</a>}
        </div>

        {/* Licenses */}
        <div className="mt-2">
          <h3 className="text-gray-900 font-semibold text-[15px] mb-2">Licenses</h3>
          {licenses.length > 0 ? licenses.map(l => (
            <div key={l.id} className="flex justify-between items-center text-[14px] mb-1">
              <span className="text-gray-600">{l.licenseName} {l.licenseNumber ? `(${l.licenseNumber})` : ''}</span>
              <span className="text-gray-500 text-[13px]">{l.expiryDate}</span>
            </div>
          )) : (
            <div className="text-[14px] text-gray-500">No licenses added.</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-8 mt-2">
          {/* Ratings */}
          <div>
            <h3 className="text-gray-900 font-semibold text-[15px] mb-2">Ratings</h3>
            {ratings.length > 0 ? ratings.map(r => (
              <div key={r.id} className="text-[14px] text-gray-600 mb-1">{r.ratingName}</div>
            )) : (
              <div className="text-[14px] text-gray-500">No ratings added.</div>
            )}
          </div>

          {/* Medical Exam */}
          <div className="text-right">
            <h3 className="text-gray-900 font-semibold text-[15px] mb-2">Medical Exam</h3>
            <div className="text-[14px] text-gray-600">{medicalClass} <span className="text-blue-500 font-semibold uppercase">CLASS</span></div>
          </div>
        </div>

        {/* Skills */}
        <div className="mt-2">
          <h3 className="text-gray-900 font-semibold text-[15px] mb-3">Skills</h3>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s: string) => (
                <div key={s} className="inline-block border border-gray-300 rounded-full px-4 py-1 text-[13px] text-gray-600 bg-transparent">
                  {s}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[14px] text-gray-500">No skills added.</div>
          )}
        </div>

      </div>

      {/* Posts Section */}
      <div className="flex flex-col gap-6 mt-8 px-4">
        {userPosts.length > 0 ? userPosts.map(post => (
          <PostCard 
            key={post.id} 
            id={post.id}
            user={{
              name: post.author?.name || "User",
              avatar: post.author?.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=user",
            }}
            date={post.created_at}
            content={post.text}
            image={post.image || undefined}
            likes={post.likes}
            liked={post.liked}
            comments={post.comments}
          />
        )) : (
          <div className="text-center text-gray-500 py-4">You haven't posted anything yet.</div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm py-4">
        No more posts
      </div>
    </div>
  );
}
