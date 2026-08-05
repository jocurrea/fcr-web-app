"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/home/post-card";
import { MapPin, Pencil, Clock, Heart, Eye, User, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfileProgress } from "@/lib/profile-progress";
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

  const [profileProgress, setProfileProgress] = useState(70);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const handleOpenVisitorsModal = async () => {
    if (!currentUserId) return;
    setShowVisitorsModal(true);
    setLoadingVisitors(true);
    try {
      let { data: visitsData } = await supabase
        .from('profile_visits')
        .select('*')
        .or(`visited_id.eq.${currentUserId},profile_user_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (visitsData && visitsData.length > 0) {
        const visitorIds = Array.from(new Set(visitsData.map(v => v.visitor_user_id || v.visitor_id).filter(Boolean)));
        
        if (visitorIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, firstName, lastName, username, profileImage')
            .in('id', visitorIds);

          const userMap = new Map(usersData?.map(u => [u.id, u]) || []);
          const formatted = visitsData.map(v => {
            const vId = v.visitor_user_id || v.visitor_id;
            return {
              ...v,
              visitor_id: vId,
              created_at: v.first_visited_at || v.created_at || v.last_visited_at,
              user: userMap.get(vId)
            };
          });
          setVisitors(formatted);
        } else {
          setVisitors(visitsData);
        }
      } else {
        setVisitors([]);
      }
    } catch (err) {
      console.error("Error fetching visitors:", err);
    } finally {
      setLoadingVisitors(false);
    }
  };

  const handleOpenLikersModal = async () => {
    if (!currentUserId) return;
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      let { data: likesData } = await supabase
        .from('profile_likes')
        .select('*')
        .or(`liked_id.eq.${currentUserId},profile_user_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (likesData && likesData.length > 0) {
        const likerIds = Array.from(new Set(likesData.map(l => l.liker_user_id || l.liker_id).filter(Boolean)));
        
        if (likerIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, firstName, lastName, username, profileImage')
            .in('id', likerIds);

          const userMap = new Map(usersData?.map(u => [u.id, u]) || []);
          const formatted = likesData.map(l => {
            const lId = l.liker_user_id || l.liker_id;
            return {
              ...l,
              liker_id: lId,
              user: userMap.get(lId)
            };
          });
          setLikers(formatted);
        } else {
          setLikers(likesData);
        }
      } else {
        setLikers([]);
      }
    } catch (err) {
      console.error("Error fetching likers:", err);
    } finally {
      setLoadingLikers(false);
    }
  };

  useEffect(() => {
    // Load Data from Supabase
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const allPosts = await fetchPosts();
        if (session?.user) {
          setCurrentUserId(session.user.id);
          setUserPosts(allPosts.filter(p => p.user_id === session.user.id));

          // Fetch user profile data (crew_data) from resumes and users
          const [userRes, resumeRes] = await Promise.all([
            supabase.from('users').select('profileImage').eq('id', session.user.id).single(),
            supabase.from('resumes').select('data').eq('userId', session.user.id).single()
          ]);

          const profileImage = userRes.data?.profileImage || null;
          const crewData = resumeRes.data?.data || null;

          setProfilePhoto(profileImage || localStorage.getItem("userProfilePhoto"));
          
          const savedPersonal = localStorage.getItem("onboarding_personal");
          const savedLicenses = localStorage.getItem("onboarding_licenses");
          const savedRatings = localStorage.getItem("onboarding_ratings");
          const savedWork = localStorage.getItem("onboarding_work");
          const savedResume = localStorage.getItem("onboarding_resume");

          const localPersonal = savedPersonal ? JSON.parse(savedPersonal) : null;
          const localLicenses = savedLicenses ? JSON.parse(savedLicenses) : null;
          const localRatings = savedRatings ? JSON.parse(savedRatings) : null;
          const localWork = savedWork ? JSON.parse(savedWork) : null;
          const localResume = savedResume ? JSON.parse(savedResume) : null;

          const finalPersonal = crewData?.personal || localPersonal;
          const finalLicenses = (crewData?.licenses && crewData.licenses.length > 0) ? crewData.licenses : (localLicenses || []);
          const finalRatings = (crewData?.ratings && crewData.ratings.length > 0) ? crewData.ratings : (localRatings || []);
          const finalWork = crewData?.work || localWork;
          const finalResume = crewData?.resume || localResume;

          if (finalPersonal) setPersonal(finalPersonal);
          if (finalLicenses) setLicenses(finalLicenses);
          if (finalRatings) setRatings(finalRatings);
          if (finalWork) setWork(finalWork);
          if (finalResume) {
            setResume(finalResume);
            if (finalResume.languages) setLanguages(finalResume.languages);
          }

          if (session?.user?.id) {
            fetchProfileProgress(session.user.id).then((progress) => setProfileProgress(progress));
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
            const companyLogo = companies[0].logo_url || profileImage || localStorage.getItem("userProfilePhoto");
            setCompanyInfo({
              name: companies[0].name,
              status: companies[0].status,
              logo: companyLogo
            });
            if (companyLogo) {
              setProfilePhoto(companyLogo);
            }
          } else if (!profileImage) {
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
    { id: "ar", label: "Argentina" }, { id: "au", label: "Australia" }, { id: "at", label: "Austria" },
    { id: "bh", label: "Bahrain" }, { id: "bd", label: "Bangladesh" }, { id: "be", label: "Belgium" },
    { id: "br", label: "Brazil" }, { id: "ca", label: "Canada" }, { id: "cl", label: "Chile" },
    { id: "cn", label: "China" }, { id: "co", label: "Colombia" }, { id: "cz", label: "Czech Republic" },
    { id: "dk", label: "Denmark" }, { id: "eg", label: "Egypt" }, { id: "fi", label: "Finland" },
    { id: "fr", label: "France" }, { id: "de", label: "Germany" }, { id: "gr", label: "Greece" },
    { id: "hu", label: "Hungary" }, { id: "in", label: "India" }, { id: "id", label: "Indonesia" },
    { id: "ie", label: "Ireland" }, { id: "il", label: "Israel" }, { id: "it", label: "Italy" },
    { id: "jp", label: "Japan" }, { id: "ke", label: "Kenya" }, { id: "kw", label: "Kuwait" },
    { id: "my", label: "Malaysia" }, { id: "mx", label: "Mexico" }, { id: "np", label: "Nepal" },
    { id: "nl", label: "Netherlands" }, { id: "nz", label: "New Zealand" }, { id: "ng", label: "Nigeria" },
    { id: "no", label: "Norway" }, { id: "om", label: "Oman" }, { id: "pk", label: "Pakistan" },
    { id: "pe", label: "Peru" }, { id: "ph", label: "Philippines" }, { id: "pl", label: "Poland" },
    { id: "pt", label: "Portugal" }, { id: "qa", label: "Qatar" }, { id: "ro", label: "Romania" },
    { id: "ru", label: "Russia" }, { id: "sa", label: "Saudi Arabia" }, { id: "sg", label: "Singapore" },
    { id: "za", label: "South Africa" }, { id: "kr", label: "South Korea" }, { id: "es", label: "Spain" },
    { id: "lk", label: "Sri Lanka" }, { id: "se", label: "Sweden" }, { id: "ch", label: "Switzerland" },
    { id: "th", label: "Thailand" }, { id: "tr", label: "Turkey" }, { id: "ae", label: "United Arab Emirates" },
    { id: "gb", label: "United Kingdom" }, { id: "us", label: "United States" }, { id: "ve", label: "Venezuela" },
    { id: "vn", label: "Vietnam" }
  ];

  const fullName = personal ? `${personal.firstName || ""} ${personal.middleName || ""} ${personal.lastName || ""}`.trim().replace(/\s+/g, ' ') : "asdasd asdasd asdasd";
  const description = personal?.description || "Testasdasd";
  const rawCountry = personal?.selectedCountry || "br";
  const country = COUNTRIES.find(c => c.id === rawCountry)?.label || "Brazil";
  
  const commandTypeLabel = work?.commandType === "sic" ? "Second in Command" : "Pilot in Command";
  const flightHours = personal?.totalFlightHours || "0";
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
        <div className="relative flex items-center justify-center p-1.5 bg-white rounded-full shadow-xl">
          {/* Progress Ring SVG - Acts as the ring border directly around photo */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 160 160">
            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r="74"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            {/* Active Progress Arc */}
            <circle
              cx="80"
              cy="80"
              r="74"
              fill="none"
              stroke={profileProgress === 100 ? "#059669" : profileProgress >= 70 ? "#f97316" : "#16a34a"}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 74}`}
              strokeDashoffset={`${2 * Math.PI * 74 - (2 * Math.PI * 74 * profileProgress) / 100}`}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>

          {/* Avatar Photo */}
          <div className="w-36 h-36 rounded-full overflow-hidden bg-gray-100 z-10">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            )}
          </div>

          {/* Percentage Badge */}
          <div 
            className={`absolute bottom-[-8px] left-1/2 -translate-x-1/2 bg-white px-2.5 py-0.5 rounded-full text-[11px] font-bold ${profileProgress === 100 ? 'text-[#059669]' : profileProgress >= 70 ? 'text-[#f97316]' : 'text-[#16a34a]'} border border-gray-200 shadow-md z-30`}
          >
            {profileProgress}%
          </div>

          {/* Edit Icon */}
          <Link href="/onboarding?edit=true" className="absolute bottom-0 right-0 w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer z-30">
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

        {/* Profile Action Buttons (Profile likes & Profile visitors) */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button 
            onClick={handleOpenLikersModal}
            style={{ color: '#1d6bf3', borderColor: '#1d6bf3', borderWidth: '2px' }}
            className="bg-white rounded-full px-5 py-2 flex items-center gap-2 font-bold text-[14.5px] hover:bg-blue-50 transition-all shadow-sm cursor-pointer border-solid"
          >
            <Heart className="w-5 h-5" style={{ fill: '#1d6bf3', color: '#1d6bf3' }} />
            <span style={{ color: '#1d6bf3' }}>Profile likes</span>
          </button>

          <button 
            onClick={handleOpenVisitorsModal}
            style={{ color: '#1d6bf3', borderColor: '#1d6bf3', borderWidth: '2px' }}
            className="bg-white rounded-full px-5 py-2 flex items-center gap-2 font-bold text-[14.5px] hover:bg-blue-50 transition-all shadow-sm cursor-pointer border-solid"
          >
            <Eye className="w-5 h-5" style={{ color: '#1d6bf3' }} />
            <span style={{ color: '#1d6bf3' }}>Profile visitors</span>
          </button>
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
          <div className="flex items-center gap-2 text-gray-800 font-medium">
            <MapPin className="w-[16px] h-[16px] text-gray-600" />
            {rawCountry && (
              <img src={`https://flagcdn.com/w20/${rawCountry}.png`} srcSet={`https://flagcdn.com/w40/${rawCountry}.png 2x`} width="20" alt="flag" className="shadow-sm" />
            )}
            <span className="text-[15px]">{country}</span>
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

      {/* Profile Visitors Modal (HU14.4) */}
      {showVisitorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Eye className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Profile Visitors</h2>
              </div>
              <button 
                onClick={() => setShowVisitorsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {loadingVisitors ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : visitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 gap-2">
                  <User className="w-10 h-10 text-gray-300" />
                  <p className="text-sm font-medium">No profile visits recorded yet.</p>
                </div>
              ) : (
                visitors.map((visit, index) => {
                  const visitorUser = visit.user;
                  const name = visitorUser 
                    ? ([visitorUser.firstName, visitorUser.lastName].filter(Boolean).join(' ').trim() || visitorUser.username || 'User')
                    : 'Anonymous User';
                  
                  return (
                    <Link
                      key={visit.id || index}
                      href={`/profile/${visit.visitor_id}`}
                      onClick={() => setShowVisitorsModal(false)}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {visitorUser?.profileImage ? (
                          <img 
                            src={visitorUser.profileImage} 
                            alt="" 
                            className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                            {name[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-gray-500">
                            Visited {new Date(visit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Likers Modal (HU14.5) */}
      {showLikersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Heart className="w-5 h-5 fill-blue-600 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Profile Likes</h2>
              </div>
              <button 
                onClick={() => setShowLikersModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {loadingLikers ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : likers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 gap-2">
                  <Heart className="w-10 h-10 text-gray-300" />
                  <p className="text-sm font-medium">No profile likes recorded yet.</p>
                </div>
              ) : (
                likers.map((like, index) => {
                  const likerUser = like.user;
                  const name = likerUser 
                    ? ([likerUser.firstName, likerUser.lastName].filter(Boolean).join(' ').trim() || likerUser.username || 'User')
                    : 'Anonymous User';
                  
                  return (
                    <Link
                      key={like.id || index}
                      href={`/profile/${like.liker_id}`}
                      onClick={() => setShowLikersModal(false)}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {likerUser?.profileImage ? (
                          <img 
                            src={likerUser.profileImage} 
                            alt="" 
                            className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                            {name[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-gray-500">
                            Liked {new Date(like.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
