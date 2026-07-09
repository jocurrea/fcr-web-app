"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/home/post-card";
import { MapPin, Pencil, Clock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchPosts } from "@/lib/api/posts";

export default function ProfilePage() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  const [personal, setPersonal] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [work, setWork] = useState<any>(null);
  const [languages, setLanguages] = useState<{name: string, proficiency: string}[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);

  // Business Profile State
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ name: string, status: string, logo?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Data from Supabase
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const allPosts = await fetchPosts();
        if (session?.user) {
          setUserPosts(allPosts.filter(p => p.user_id === session.user.id));

          // Fetch user profile data (crew_data)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('avatar_url, crew_data')
            .eq('id', session.user.id)
            .single();

          if (profileData) {
            setProfilePhoto(profileData.avatar_url || localStorage.getItem("userProfilePhoto"));
            
            if (profileData.crew_data) {
              const crewData = profileData.crew_data as any;
              if (crewData.personal) setPersonal(crewData.personal);
              if (crewData.licenses) setLicenses(crewData.licenses);
              if (crewData.ratings) setRatings(crewData.ratings);
              if (crewData.work) setWork(crewData.work);
              if (crewData.resume) {
                setResume(crewData.resume);
                if (crewData.resume.languages) setLanguages(crewData.resume.languages);
              }
            } else {
              // Fallback for older sessions that didn't save to Supabase yet
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
            }
          }

          // Check if user has a business company
          const { data: companies, error } = await supabase
            .from('companies')
            .select('name, status, logo_url')
            .eq('owner_user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error("Error fetching companies:", error);
          }

          if (companies && companies.length > 0) {
            setIsBusiness(true);
            const companyLogo = companies[0].logo_url || profileData?.avatar_url || localStorage.getItem("userProfilePhoto");
            setCompanyInfo({
              name: companies[0].name,
              status: companies[0].status,
              logo: companyLogo
            });
            if (companyLogo) {
              setProfilePhoto(companyLogo);
            }
          } else if (!profileData?.avatar_url) {
            const savedPhoto = localStorage.getItem("userProfilePhoto");
            if (savedPhoto) setProfilePhoto(savedPhoto);
          }
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const COUNTRIES = [
    { id: "ar", label: "🇦🇷 Argentina" }, { id: "au", label: "🇦🇺 Australia" }, { id: "at", label: "🇦🇹 Austria" },
    { id: "bh", label: "🇧🇭 Bahrain" }, { id: "bd", label: "🇧🇩 Bangladesh" }, { id: "be", label: "🇧🇪 Belgium" },
    { id: "br", label: "🇧🇷 Brazil" }, { id: "ca", label: "🇨🇦 Canada" }, { id: "cl", label: "🇨🇱 Chile" },
    { id: "cn", label: "🇨🇳 China" }, { id: "co", label: "🇨🇴 Colombia" }, { id: "cz", label: "🇨🇿 Czech Republic" },
    { id: "dk", label: "🇩🇰 Denmark" }, { id: "eg", label: "🇪🇬 Egypt" }, { id: "fi", label: "🇫🇮 Finland" },
    { id: "fr", label: "🇫🇷 France" }, { id: "de", label: "🇩🇪 Germany" }, { id: "gr", label: "🇬🇷 Greece" },
    { id: "hu", label: "🇭🇺 Hungary" }, { id: "in", label: "🇮🇳 India" }, { id: "id", label: "🇮🇩 Indonesia" },
    { id: "ie", label: "🇮🇪 Ireland" }, { id: "il", label: "🇮🇱 Israel" }, { id: "it", label: "🇮🇹 Italy" },
    { id: "jp", label: "🇯🇵 Japan" }, { id: "ke", label: "🇰🇪 Kenya" }, { id: "kw", label: "🇰🇼 Kuwait" },
    { id: "my", label: "🇲🇾 Malaysia" }, { id: "mx", label: "🇲🇽 Mexico" }, { id: "np", label: "🇳🇵 Nepal" },
    { id: "nl", label: "🇳🇱 Netherlands" }, { id: "nz", label: "🇳🇿 New Zealand" }, { id: "ng", label: "🇳🇬 Nigeria" },
    { id: "no", label: "🇳🇴 Norway" }, { id: "om", label: "🇴🇲 Oman" }, { id: "pk", label: "🇵🇰 Pakistan" },
    { id: "pe", label: "🇵🇪 Peru" }, { id: "ph", label: "🇵🇭 Philippines" }, { id: "pl", label: "🇵🇱 Poland" },
    { id: "pt", label: "🇵🇹 Portugal" }, { id: "qa", label: "🇶🇦 Qatar" }, { id: "ro", label: "🇷🇴 Romania" },
    { id: "ru", label: "🇷🇺 Russia" }, { id: "sa", label: "🇸🇦 Saudi Arabia" }, { id: "sg", label: "🇸🇬 Singapore" },
    { id: "za", label: "🇿🇦 South Africa" }, { id: "kr", label: "🇰🇷 South Korea" }, { id: "es", label: "🇪🇸 Spain" },
    { id: "lk", label: "🇱🇰 Sri Lanka" }, { id: "se", label: "🇸🇪 Sweden" }, { id: "ch", label: "🇨🇭 Switzerland" },
    { id: "th", label: "🇹🇭 Thailand" }, { id: "tr", label: "🇹🇷 Turkey" }, { id: "ae", label: "🇦🇪 United Arab Emirates" },
    { id: "gb", label: "🇬🇧 United Kingdom" }, { id: "us", label: "🇺🇸 United States" }, { id: "ve", label: "🇻🇪 Venezuela" },
    { id: "vn", label: "🇻🇳 Vietnam" }
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

  // =====================
  // BUSINESS PROFILE VIEW
  // =====================
  if (isBusiness) {
    return (
      <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 py-8 gap-6">
        
        {/* Company Card */}
        <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100">
          <div className="flex items-center gap-5">
            {/* Logo */}
            <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
              {companyInfo?.logo ? (
                <img src={companyInfo.logo} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex flex-col">
              <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight tracking-tight">{companyInfo?.name || "Company Name"}</h1>
              <span className="text-[15px] text-gray-500 mt-0.5 mb-2.5 font-medium">Corporate associate account</span>
              
              {companyInfo?.status === 'pending' && (
                <div className="inline-flex">
                  <div className="bg-[#fff4d1] text-[#b38800] px-4 py-1 rounded-full text-[13px] font-bold tracking-wide">
                    Pending review
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Review Banner */}
        {companyInfo?.status === 'pending' && (
          <div className="bg-[#f0f6ff] border border-[#e0eaff] p-5 rounded-[16px] flex items-start gap-4 w-full">
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

        {/* Posts */}
        <div className="flex flex-col gap-6 mt-4">
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
            <div className="text-center text-gray-800 text-[16px] py-10 mt-10">No posts yet</div>
          )}
        </div>
      </div>
    );
  }

  // =====================
  // CREW PROFILE VIEW
  // =====================
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
