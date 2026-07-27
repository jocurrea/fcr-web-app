"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/home/post-card";
import { MapPin, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchPosts } from "@/lib/api/posts";

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const profileId = params.id;
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

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setCurrentUserId(session.user.id);
        
        const allPosts = await fetchPosts();
        setUserPosts(allPosts.filter(p => p.user_id === profileId));

        // Fetch user profile data
        const [userRes, resumeRes] = await Promise.all([
          supabase.from('users').select('profileImage').eq('id', profileId).maybeSingle(),
          supabase.from('resumes').select('data').eq('userId', profileId).maybeSingle()
        ]);

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

        // Check if I have already liked this profile
        if (session) {
          const { data: likeData } = await supabase
            .from('profile_likes')
            .select('*')
            .eq('liker_id', session.user.id)
            .eq('liked_id', profileId)
            .maybeSingle();
            
          if (likeData) setHasLiked(true);
          
          // Register a visit if I'm not the owner
          if (session.user.id !== profileId) {
            // Wait 2 seconds before counting it as a visit to avoid spam
            setTimeout(async () => {
              await supabase.from('profile_visits').insert({
                visitor_id: session.user.id,
                visited_id: profileId
              });
              
              await supabase.from('notifications').insert({
                title: 'New profile visit',
                data: `Someone visited your profile`,
                senderId: session.user.id,
                receiverId: profileId,
                type: 'visit'
              });
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
    if (!currentUserId || hasLiked) return;
    
    try {
      setHasLiked(true);
      await supabase.from('profile_likes').insert({
        liker_id: currentUserId,
        liked_id: profileId
      });
      
      await supabase.from('notifications').insert({
        title: 'New Like',
        data: `Someone liked your profile`,
        senderId: currentUserId,
        receiverId: profileId,
        type: 'like'
      });
    } catch (e) {
      console.error(e);
      setHasLiked(false);
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
    { id: "ar", label: "Argentina" }, { id: "br", label: "Brazil" }, { id: "mx", label: "Mexico" }, { id: "us", label: "United States" }
  ];

  const fullName = personal ? `${personal.firstName || ""} ${personal.lastName || ""}`.trim() : "Unknown User";
  const description = personal?.description || "";
  const rawCountry = personal?.selectedCountry || "us";
  const country = COUNTRIES.find(c => c.id === rawCountry)?.label || "Unknown";
  
  const commandTypeLabel = work?.commandType === "sic" ? "Second in Command" : "Pilot in Command";
  const flightHours = work?.flightHours || "0";
  const medicalClass = work?.medicalClass || "1st";
  const website = resume?.websites?.[0] || "";
  const skills = resume?.skills || [];

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
            
            {currentUserId !== profileId && (
              <button 
                onClick={handleLike}
                disabled={hasLiked}
                className={`p-3 rounded-full flex items-center justify-center transition-colors shadow-sm border ${hasLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
              >
                <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
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

      <div className="w-full flex justify-between items-end px-6 -mt-20 relative z-10">
        <div className="w-36 h-36 rounded-full overflow-hidden border-[4px] border-[#f8f9fa] bg-[#f8f9fa]">
          {profilePhoto ? (
            <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100" />
          )}
        </div>
        
        {currentUserId !== profileId && (
          <button 
            onClick={handleLike}
            disabled={hasLiked}
            className={`mb-4 p-3 rounded-full flex items-center justify-center transition-colors shadow-sm border ${hasLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
          >
            <Heart className={`w-7 h-7 ${hasLiked ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      <div className="mt-6 px-6 flex flex-col w-full">
        <h1 className="text-[26px] font-extrabold text-[#1f2937] leading-none">{fullName}</h1>
        {description && <p className="text-[15px] text-[#4b5563] mt-2">{description}</p>}
      </div>

      <div className="mt-8 px-4 text-left w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-gray-800 font-medium">
            <MapPin className="w-[16px] h-[16px] text-gray-600" />
            <span className="text-[14px] uppercase">{country}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-8 mt-2">
          <div>
            <h3 className="text-gray-900 font-semibold text-[15px] mb-2">Flight Hours</h3>
            <div className="text-[16px] text-gray-800 font-bold">{flightHours} hrs</div>
          </div>
          <div className="text-right">
            <h3 className="text-gray-900 font-semibold text-[15px] mb-2">Medical Exam</h3>
            <div className="text-[14px] text-gray-600">{medicalClass} CLASS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
