"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PostCard } from "@/components/home/post-card";
import Link from "next/link";
import { MapPin, Heart, Eye, User, X, ChevronRight, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchProfileProgress } from "@/lib/profile-progress";
import { fetchPosts } from "@/lib/api/posts";
import { cn } from "@/lib/utils";

export default function PublicProfilePage() {
  const params = useParams();
  const profileId = (params?.id as string) || "";
  const [userRecord, setUserRecord] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  const [personal, setPersonal] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [work, setWork] = useState<any>(null);
  const [languages, setLanguages] = useState<{name: string, proficiency: string}[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);

  const [isBusiness, setIsBusiness] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ name: string, status: string, logo?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const [hasLiked, setHasLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [profileProgress, setProfileProgress] = useState(15);

  const [viewsCount, setViewsCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [loadingLikers, setLoadingLikers] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setCurrentUserId(session.user.id);
        
        const allPosts = await fetchPosts();
        const postsForProfile = allPosts.filter(p => p.user_id === profileId);
        setUserPosts(postsForProfile);

        // Fetch user profile data
        const [userRes, resumeRes] = await Promise.all([
          supabase.from('users').select('id, firstName, middleName, lastName, username, profileImage').eq('id', profileId).maybeSingle(),
          supabase.from('resumes').select('data').eq('userId', profileId).maybeSingle()
        ]);

        if (userRes.data) {
          setUserRecord(userRes.data);
        }

        const profileImage = userRes.data?.profileImage || null;
        const crewData = resumeRes.data?.data || null;

        setProfilePhoto(profileImage);
        
        if (crewData) {
          if (crewData.personal) setPersonal(crewData.personal);
          if (crewData.licenses) setLicenses(crewData.licenses);
          if (crewData.ratings) setRatings(crewData.ratings);
          if (crewData.work) setWork(crewData.work);
          if (crewData.resume) {
            setResume(crewData.resume);
            if (crewData.resume.languages) setLanguages(crewData.resume.languages);
          }

        if (profileId) {
          fetchProfileProgress(profileId).then((progress) => setProfileProgress(progress));
        }
        }

        // Check if user has a business company
        const { data: companies } = await supabase
          .from('companies')
          .select('name, status, logo_url')
          .eq('owner_user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (companies && companies.length > 0) {
          setIsBusiness(true);
          const companyLogo = companies[0].logo_url || profileImage;
          setCompanyInfo({
            name: companies[0].name,
            status: companies[0].status,
            logo: companyLogo
          });
          if (companyLogo) setProfilePhoto(companyLogo);
        }

        // Fetch profile views & likes counts
        try {
          const [{ count: vCount }, { count: lCount }] = await Promise.all([
            supabase.from('profile_visits').select('*', { count: 'exact', head: true }).eq('visited_id', profileId),
            supabase.from('profile_likes').select('*', { count: 'exact', head: true }).eq('liked_id', profileId)
          ]);
          if (vCount !== null) setViewsCount(vCount);
          if (lCount !== null) setLikesCount(lCount);
        } catch (e) {
          console.error("Error fetching views/likes counts:", e);
        }

        // Check if I have already liked this profile (localStorage + Supabase)
        if (session) {
          try {
            const localKey = `liked_profiles_${session.user.id}`;
            const localLikes: string[] = JSON.parse(localStorage.getItem(localKey) || "[]");
            if (localLikes.includes(profileId)) {
              setHasLiked(true);
            }

            const { data: likeData } = await supabase
              .from('profile_likes')
              .select('*')
              .eq('liker_id', session.user.id)
              .eq('liked_id', profileId);
              
            if (likeData && likeData.length > 0) {
              setHasLiked(true);
              if (!localLikes.includes(profileId)) {
                localStorage.setItem(localKey, JSON.stringify([...localLikes, profileId]));
              }
            }
          } catch (err) {
            console.error("Error fetching profile likes:", err);
          }
          
          // Register a visit if I'm not the owner
          if (session.user.id !== profileId) {
            // Wait 2 seconds before counting it as a visit to avoid spam
            setTimeout(async () => {
              try {
                const { error: rpcErr } = await supabase.rpc('record_profile_visit', { profile_user_id: profileId });
                if (rpcErr) {
                  await supabase.from('profile_visits').insert({
                    visitor_id: session.user.id,
                    visited_id: profileId
                  });
                }
              } catch (e) {
                console.error("Visit recording fallback error:", e);
              }
            }, 2000);
          }
        }
      } catch (err) {
        console.error("Error loading public profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profileId]);

  const handleLike = async () => {
    if (!currentUserId || currentUserId === profileId) return;
    
    const localKey = `liked_profiles_${currentUserId}`;
    const localLikes: string[] = JSON.parse(localStorage.getItem(localKey) || "[]");

    if (hasLiked) {
      setHasLiked(false);
      const updatedLikes = localLikes.filter((id) => id !== profileId);
      localStorage.setItem(localKey, JSON.stringify(updatedLikes));

      try {
        const { error: rpcErr } = await supabase.rpc('set_profile_like', { profile_user_id: profileId, liked: false });
        if (rpcErr) {
          await supabase
            .from('profile_likes')
            .delete()
            .or(`liker_id.eq.${currentUserId},liker_user_id.eq.${currentUserId}`)
            .or(`liked_id.eq.${profileId},profile_user_id.eq.${profileId}`);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setHasLiked(true);
      if (!localLikes.includes(profileId)) {
        localStorage.setItem(localKey, JSON.stringify([...localLikes, profileId]));
      }

      try {
        const { error: rpcErr } = await supabase.rpc('set_profile_like', { profile_user_id: profileId, liked: true });
        if (rpcErr) {
          await supabase.from('profile_likes').insert({
            liker_id: currentUserId,
            liked_id: profileId
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleOpenVisitorsModal = async () => {
    setShowVisitorsModal(true);
    setLoadingVisitors(true);
    try {
      let { data: visitsData } = await supabase
        .from('profile_visits')
        .select('*')
        .or(`visited_id.eq.${profileId},profile_user_id.eq.${profileId}`)
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
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      let { data: likesData } = await supabase
        .from('profile_likes')
        .select('*')
        .or(`liked_id.eq.${profileId},profile_user_id.eq.${profileId}`)
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

  const nameFromPersonal = personal ? [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(" ").trim() : "";
  const nameFromUserRecord = userRecord ? ([userRecord.firstName, userRecord.middleName, userRecord.lastName].filter(Boolean).join(" ").trim() || userRecord.username || "") : "";
  const nameFromPosts = userPosts.find(p => p.author?.name && p.author.name !== "User")?.author?.name || "";

  const fullName = nameFromPersonal || nameFromUserRecord || nameFromPosts || "User";
  const description = personal?.description || "";
  const rawCountry = personal?.selectedCountry || "us";
  const country = COUNTRIES.find(c => c.id === rawCountry)?.label || "United States";
  
  const commandTypeLabel = work?.commandType === "sic" ? "Second in Command" : "Pilot in Command";
  const flightHours = personal?.totalFlightHours || personal?.flightHours || work?.flightHours || "0";
  const medicalClass = work?.medicalClass || personal?.medicalClass || "1st";
  const website = resume?.websites?.[0] || "";
  const skills = resume?.skills || [];

  const isOwnProfile = Boolean(currentUserId && profileId && currentUserId.toLowerCase() === profileId.toLowerCase());

  if (isBusiness) {
    return (
      <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 py-8 gap-6">
        <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100">
          <div className="flex items-center gap-5 justify-between">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
                {companyInfo?.logo ? (
                  <img src={companyInfo.logo} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400">Logo</div>
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">{companyInfo?.name}</h1>
                <span className="text-[15px] text-gray-500 mt-0.5 mb-2.5 font-medium">Business</span>
              </div>
            </div>
            
            {!isOwnProfile && (
              <button 
                onClick={handleLike}
                className={cn(
                  "rounded-full px-5 py-2.5 flex items-center gap-2 font-semibold text-sm transition-all shadow-sm border select-none cursor-pointer shrink-0",
                  hasLiked 
                    ? "bg-blue-600 border-blue-600 text-white shadow-blue-200" 
                    : "bg-white border-blue-500 text-blue-600 hover:bg-blue-50"
                )}
              >
                <Heart fill={hasLiked ? "white" : "none"} color={hasLiked ? "white" : "#2563eb"} className="w-5 h-5 shrink-0 transition-transform" />
                <span>{hasLiked ? "Liked" : "Like profile"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 mt-4">
          {userPosts.map(post => (
            <PostCard 
              key={post.id} 
              id={post.id}
              user={{ name: post.author?.name || "User", avatar: post.author?.avatar }}
              date={post.created_at}
              content={post.text}
              image={post.image}
              likes={post.likes}
              liked={post.liked}
              comments={post.comments}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen">
      <div className="h-[280px] w-full relative overflow-hidden bg-gray-50 flex items-center justify-center rounded-b-3xl shadow-sm">
         {profilePhoto && <img src={profilePhoto} alt="Cover" className="w-full h-full object-cover blur-lg opacity-80 scale-110" />}
      </div>

      <div className="w-full flex justify-center -mt-20 relative z-10">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Progress Ring SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 176 176">
            {/* Background Track */}
            <circle
              cx="88"
              cy="88"
              r="80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            {/* Active Progress Arc */}
            <circle
              cx="88"
              cy="88"
              r="80"
              fill="none"
              stroke={profileProgress === 100 ? "#059669" : "#f97316"}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 80}`}
              strokeDashoffset={`${2 * Math.PI * 80 - (2 * Math.PI * 80 * profileProgress) / 100}`}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>

          {/* Avatar Image */}
          <div className="w-36 h-36 rounded-full overflow-hidden border-[4px] border-[#f8f9fa] bg-[#f8f9fa] z-10 shadow-sm">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            )}
          </div>

          {/* Percentage Badge - Centered on bottom of ring */}
          <div 
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 bg-white px-2.5 py-0.5 rounded-full text-[12px] font-bold ${profileProgress === 100 ? 'text-[#059669]' : 'text-[#f97316]'} border border-gray-200 shadow-md z-30`}
          >
            {profileProgress}%
          </div>

          {isOwnProfile && (
            <Link href="/onboarding?edit=true" className="absolute bottom-2 right-2 w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer z-30">
              <Pencil className="w-[16px] h-[16px]" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 px-6 flex flex-col w-full gap-4">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col flex-1 pr-4">
            <h1 className="text-[26px] font-extrabold text-[#1f2937] leading-tight">{fullName}</h1>
            {description && <p className="text-[15px] text-[#4b5563] mt-2 leading-snug">{description}</p>}
          </div>

          {!isOwnProfile && (
            <button 
              onClick={handleLike}
              className={cn(
                "rounded-full px-5 py-2.5 flex items-center gap-2 font-semibold text-sm transition-all shadow-sm border select-none cursor-pointer shrink-0 mt-1",
                hasLiked 
                  ? "bg-blue-600 border-blue-600 text-white shadow-blue-200" 
                  : "bg-white border-blue-500 text-blue-600 hover:bg-blue-50"
              )}
            >
              <Heart fill={hasLiked ? "white" : "none"} color={hasLiked ? "white" : "#2563eb"} className="w-5 h-5 shrink-0 transition-transform" />
              <span>{hasLiked ? "Liked" : "Like profile"}</span>
            </button>
          )}
        </div>

        {/* Profile Action Buttons: ONLY on personal profile */}
        {isOwnProfile && (
          <div className="flex items-center gap-3 mt-1 flex-wrap">
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
        )}
      </div>

      <div className="mt-6 px-4 text-left w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 px-2">
          <div className="flex items-center gap-2 text-gray-800 font-medium">
            <MapPin className="w-[16px] h-[16px] text-gray-600" />
            {rawCountry && (
              <img 
                src={`https://flagcdn.com/w20/${rawCountry.toLowerCase()}.png`} 
                srcSet={`https://flagcdn.com/w40/${rawCountry.toLowerCase()}.png 2x`} 
                width="20" 
                alt={country} 
                className="shadow-sm rounded-[2px]" 
              />
            )}
            <span className="text-[14px] text-gray-800 font-medium">{country}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-8 px-2">
          <div>
            <h3 className="text-gray-900 font-semibold text-[15px] mb-1">Flight Hours</h3>
            <div className="text-[16px] text-gray-800 font-bold">{flightHours} hrs</div>
          </div>
          <div className="text-right">
            <h3 className="text-gray-900 font-semibold text-[15px] mb-1">Medical Exam</h3>
            <div className="text-[14px] text-gray-600 font-medium">{medicalClass} CLASS</div>
          </div>
        </div>



        {/* User Posts */}
        {userPosts.length > 0 && (
          <div className="flex flex-col gap-6 mt-4">
            {userPosts.map(post => (
              <PostCard 
                key={post.id} 
                id={post.id}
                user={{
                  id: post.user_id,
                  name: post.author?.name || fullName,
                  avatar: post.author?.avatar || profilePhoto || "https://api.dicebear.com/7.x/shapes/svg?seed=user"
                }}
                date={post.created_at}
                content={post.text}
                image={post.image}
                likes={post.likes}
                liked={post.liked}
                comments={post.comments}
              />
            ))}
          </div>
        )}
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
