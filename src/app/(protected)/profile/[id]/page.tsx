"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PostCard } from "@/components/home/post-card";
import Link from "next/link";
import { MapPin, Heart, Eye, User, X, ChevronRight, ChevronLeft, Pencil, Phone, Mail, Clock, Globe, Calendar, FileText, Briefcase, Plane } from "lucide-react";
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
  const [companyInfo, setCompanyInfo] = useState<{ 
    name: string; 
    status: string; 
    logo?: string | null;
    location?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    description?: string | null;
    foundedYear?: number | string | null;
    operatingAreas?: string[];
    services?: string[];
    fleetTypes?: string[];
    types?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [hasLiked, setHasLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [profileProgress, setProfileProgress] = useState(70);

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
          .select('id, name, status, logo_url, location, contact_email, phone, website, description, founded_year, operating_areas, services, fleet_types')
          .eq('owner_user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (companies && companies.length > 0) {
          setIsBusiness(true);
          const comp = companies[0] as any;
          let companyTypeLabels: string[] = [];

          try {
            const { data: selections } = await supabase
              .from('company_type_selections')
              .select('company_type_id, company_types(label, key, name)')
              .eq('company_id', comp.id);

            if (selections && selections.length > 0) {
              companyTypeLabels = selections
                .map((s: any) => s.company_types?.label || s.company_types?.name || s.company_types?.key)
                .filter(Boolean);
            }
          } catch (e) {
            // RLS or foreign key fallback
          }

          if (companyTypeLabels.length === 0 && comp.services && Array.isArray(comp.services) && comp.services.length > 0) {
            companyTypeLabels = comp.services;
          }

          if (typeof window !== 'undefined') {
            try {
              const saved = localStorage.getItem("company_types_" + comp.id) || localStorage.getItem("company_types_latest");
              if (saved) {
                const parsed = JSON.parse(saved) as string[];
                if (parsed.length > 0) {
                  companyTypeLabels = parsed;
                }
              }
            } catch (e) {}
          }

          if (companyTypeLabels.length === 0) {
            companyTypeLabels = ["Airline / Operator", "Charter Company", "Flight School"];
          }

          const companyLogo = comp.logo_url || profileImage;
          setCompanyInfo({
            name: comp.name || "Company Name",
            status: comp.status,
            logo: companyLogo,
            location: comp.location,
            email: comp.contact_email,
            phone: comp.phone,
            website: comp.website,
            description: comp.description,
            foundedYear: comp.founded_year,
            operatingAreas: comp.operating_areas || [],
            services: comp.services || [],
            fleetTypes: comp.fleet_types || [],
            types: companyTypeLabels
          });
          if (companyLogo) setProfilePhoto(companyLogo);
        }

        // Fetch profile views & likes counts
        try {
          const [{ count: vCount }, { count: lCount }] = await Promise.all([
            supabase.from('profile_visits').select('*', { count: 'exact', head: true }).eq('profile_user_id', profileId),
            supabase.from('profile_likes').select('*', { count: 'exact', head: true }).eq('profile_user_id', profileId)
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
              .eq('liker_user_id', session.user.id)
              .eq('profile_user_id', profileId);
              
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
            // Wait 1.5 seconds before counting it as a visit to avoid spam
            setTimeout(async () => {
              try {
                const { error: rpcErr } = await supabase.rpc('record_profile_visit', { profile_user_id: profileId });
                if (rpcErr) {
                  await supabase.from('profile_visits').insert({
                    visitor_user_id: session.user.id,
                    profile_user_id: profileId
                  });
                }
              } catch (e) {
                console.error("Visit recording fallback error:", e);
              }
            }, 1500);
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
            .eq('liker_user_id', currentUserId)
            .eq('profile_user_id', profileId);
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
            liker_user_id: currentUserId,
            profile_user_id: profileId
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
        .eq('profile_user_id', profileId)
        .order('last_visited_at', { ascending: false });

      if (visitsData && visitsData.length > 0) {
        const visitorIds = Array.from(new Set(visitsData.map(v => v.visitor_user_id || v.visitor_id).filter(Boolean)));
        
        if (visitorIds.length > 0) {
          const [{ data: usersData }, { data: companiesData }] = await Promise.all([
            supabase
              .from('users')
              .select('id, firstName, lastName, username, profileImage')
              .in('id', visitorIds),
            supabase
              .from('companies')
              .select('owner_user_id, name, logo_url')
              .in('owner_user_id', visitorIds)
          ]);

          const compMap = new Map((companiesData || []).map(c => [c.owner_user_id, c]));
          const userMap = new Map((usersData || []).map(u => {
            const comp = compMap.get(u.id);
            return [u.id, {
              ...u,
              companyName: comp?.name || null,
              profileImage: u.profileImage || comp?.logo_url || null
            }];
          }));

          const formatted = visitsData.map(v => {
            const vId = v.visitor_user_id || v.visitor_id;
            const usr = userMap.get(vId) || (compMap.has(vId) ? {
              id: vId,
              companyName: compMap.get(vId)?.name,
              profileImage: compMap.get(vId)?.logo_url
            } : null);
            return {
              ...v,
              visitor_id: vId,
              created_at: v.last_visited_at || v.first_visited_at || v.created_at,
              user: usr
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
        .eq('profile_user_id', profileId)
        .order('created_at', { ascending: false });

      if (likesData && likesData.length > 0) {
        const likerIds = Array.from(new Set(likesData.map(l => l.liker_user_id || l.liker_id).filter(Boolean)));
        
        if (likerIds.length > 0) {
          const [{ data: usersData }, { data: companiesData }] = await Promise.all([
            supabase
              .from('users')
              .select('id, firstName, lastName, username, profileImage')
              .in('id', likerIds),
            supabase
              .from('companies')
              .select('owner_user_id, name, logo_url')
              .in('owner_user_id', likerIds)
          ]);

          const compMap = new Map((companiesData || []).map(c => [c.owner_user_id, c]));
          const userMap = new Map((usersData || []).map(u => {
            const comp = compMap.get(u.id);
            return [u.id, {
              ...u,
              companyName: comp?.name || null,
              profileImage: u.profileImage || comp?.logo_url || null
            }];
          }));

          const formatted = likesData.map(l => {
            const lId = l.liker_user_id || l.liker_id;
            const usr = userMap.get(lId) || (compMap.has(lId) ? {
              id: lId,
              companyName: compMap.get(lId)?.name,
              profileImage: compMap.get(lId)?.logo_url
            } : null);
            return {
              ...l,
              liker_id: lId,
              user: usr
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
    const isApproved = companyInfo?.status === 'active' || companyInfo?.status === 'approved';
    const isPending = !isApproved;

    return (
      <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen px-4 py-6 gap-5">
        
        {/* Company Header Card */}
        <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100">
          <div className="flex items-start gap-4">
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
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight tracking-tight truncate">{companyInfo?.name || "Company Name"}</h1>
                {isApproved ? (
                  <div className="flex items-center gap-2">
                    <span className="bg-[#dcfce7] text-[#15803d] px-3.5 py-1 rounded-full text-xs font-bold">Active</span>
                    {isOwnProfile && (
                      <Link href="/onboarding-business" className="border border-[#1d6bf3] text-[#1d6bf3] hover:bg-blue-50 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Link>
                    )}
                  </div>
                ) : (
                  <span className="bg-[#fef9c3] text-[#a16207] px-3.5 py-1.5 rounded-full text-xs font-bold">Pending review</span>
                )}
              </div>
              <span className="text-[14px] text-gray-500 mt-1 font-medium">Corporate associate account</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Profile Likes & Profile Visitors */}
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleOpenLikersModal}
            style={{ color: '#1d6bf3', borderColor: '#1d6bf3', borderWidth: '2px' }}
            className="bg-white rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-[14.5px] hover:bg-blue-50 transition-all shadow-sm cursor-pointer border-solid"
          >
            <Heart className="w-5 h-5" style={{ fill: '#1d6bf3', color: '#1d6bf3' }} />
            <span style={{ color: '#1d6bf3' }}>Profile likes</span>
          </button>

          <button 
            onClick={handleOpenVisitorsModal}
            style={{ color: '#1d6bf3', borderColor: '#1d6bf3', borderWidth: '2px' }}
            className="bg-white rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-[14.5px] hover:bg-blue-50 transition-all shadow-sm cursor-pointer border-solid"
          >
            <Eye className="w-5 h-5" style={{ color: '#1d6bf3' }} />
            <span style={{ color: '#1d6bf3' }}>Profile visitors</span>
          </button>
        </div>

        {/* Pending Review Banner */}
        {isPending && isOwnProfile && (
          <div className="bg-[#f0f6ff] border border-[#e0eaff] p-5 rounded-[20px] flex items-start gap-4 w-full shadow-sm">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
              <Clock className="w-[22px] h-[22px] text-[#1a56db]" strokeWidth={2.5} />
            </div>
            <div className="mt-0.5">
              <h3 className="font-bold text-[16px] text-gray-900 mb-1">Company profile under review</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">
                Posting, commenting, liking, and creating Frequencies are disabled until your company is approved.
              </p>
            </div>
          </div>
        )}

        {/* Company Details Section */}
        {(companyInfo?.location || companyInfo?.email || companyInfo?.phone || companyInfo?.website || companyInfo?.foundedYear || companyInfo?.description) && (
          <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100 gap-4">
            <h2 className="font-bold text-[17px] text-gray-900">Company details</h2>
            <div className="space-y-4">
              {companyInfo?.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Location</p>
                    <p className="text-[15px] font-semibold text-gray-900">{companyInfo.location}</p>
                  </div>
                </div>
              )}
              {companyInfo?.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Email</p>
                    <p className="text-[15px] font-semibold text-gray-900">{companyInfo.email}</p>
                  </div>
                </div>
              )}
              {companyInfo?.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Phone</p>
                    <p className="text-[15px] font-semibold text-gray-900">{companyInfo.phone}</p>
                  </div>
                </div>
              )}
              {companyInfo?.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Website</p>
                    <a 
                      href={companyInfo.website.startsWith('http') ? companyInfo.website : `https://${companyInfo.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[15px] font-semibold text-blue-600 hover:underline"
                    >
                      {companyInfo.website}
                    </a>
                  </div>
                </div>
              )}
              {companyInfo?.foundedYear && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Founded year</p>
                    <p className="text-[15px] font-semibold text-gray-900">{companyInfo.foundedYear}</p>
                  </div>
                </div>
              )}
              {companyInfo?.description && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">About company</p>
                    <p className="text-[14.5px] font-medium text-gray-800 leading-relaxed mt-0.5">{companyInfo.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Types Section */}
        {companyInfo?.types && companyInfo.types.length > 0 && (
          <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100 gap-4">
            <h2 className="font-bold text-[17px] text-gray-900">Company types</h2>
            <div className="flex flex-wrap gap-2.5">
              {companyInfo.types.map(type => (
                <span key={type} className="bg-[#f3f4f6] text-gray-800 rounded-full px-4.5 py-2 text-[14px] font-medium">
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Operating Areas Section */}
        {companyInfo?.operatingAreas && companyInfo.operatingAreas.length > 0 && (
          <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100 gap-4">
            <h2 className="font-bold text-[17px] text-gray-900">Operating areas</h2>
            <div className="flex flex-wrap gap-2.5">
              {companyInfo.operatingAreas.map(area => (
                <span key={area} className="bg-[#eef4ff] text-[#2d73f5] rounded-full px-4.5 py-2 text-[14px] font-semibold">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Services Offered Section */}
        {companyInfo?.services && companyInfo.services.length > 0 && (
          <div className="bg-[#ffffff] rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100 gap-4">
            <h2 className="font-bold text-[17px] text-gray-900">Services offered</h2>
            <div className="flex flex-wrap gap-2.5">
              {companyInfo.services.map(service => (
                <span key={service} className="bg-[#eef4ff] text-[#2d73f5] rounded-full px-4.5 py-2 text-[14px] font-semibold">
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fleet Types Section */}
        {companyInfo?.fleetTypes && companyInfo.fleetTypes.length > 0 && (
          <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100 gap-4">
            <h2 className="font-bold text-[17px] text-gray-900">Fleet types</h2>
            <div className="flex flex-wrap gap-2.5">
              {companyInfo.fleetTypes.map(fleet => (
                <span key={fleet} className="bg-[#eef4ff] text-[#2d73f5] rounded-full px-4.5 py-2 text-[14px] font-semibold">
                  {fleet}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="flex flex-col gap-6 mt-2">
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
            <div className="text-center text-gray-700 font-medium text-[15px] py-8">No posts yet</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full pb-12 bg-[#f8f9fa] min-h-screen">
      <div className="h-[280px] w-full relative overflow-hidden bg-gray-50 flex items-center justify-center rounded-b-3xl shadow-sm">
         {profilePhoto && <img src={profilePhoto} alt="Cover" className="w-full h-full object-cover blur-lg opacity-80 scale-110" />}
      </div>
      {/* Avatar Container - Overlaps cover */}
      <div className="w-full flex justify-center -mt-20 mb-4 relative z-20">
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
              stroke={profileProgress === 100 ? "#059669" : "#f97316"}
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

          {/* Percentage Badge - Explicit inline style guarantees bottom positioning at 6 o'clock */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 rounded-full text-[12px] font-bold ${profileProgress === 100 ? 'text-[#059669]' : 'text-[#f97316]'} border border-gray-200 shadow-lg z-50`}
            style={{ bottom: '-10px' }}
          >
            {profileProgress}%
          </div>

          {isOwnProfile && (
            <Link href="/onboarding?edit=true" className="absolute bottom-0 right-0 w-9 h-9 bg-white border-2 border-white rounded-full flex items-center justify-center shadow-lg text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer z-50">
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

      {/* Profile Visitors Screen View */}
      {showVisitorsModal && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col w-full h-full max-w-lg mx-auto">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 relative bg-white shrink-0 shadow-sm">
            <button 
              onClick={() => setShowVisitorsModal(false)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-[18px] text-gray-900 absolute left-1/2 -translate-x-1/2">
              Profile Visitors
            </h1>
            <div className="w-10 h-10 opacity-0 pointer-events-none" />
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {loadingVisitors ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Loading profile visitors...
              </div>
            ) : visitors.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-[15px] font-normal">
                No profile visitors yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {visitors.map((visit, index) => {
                  const visitorUser = visit.user;
                  const name = visitorUser 
                    ? (visitorUser.companyName || [visitorUser.firstName, visitorUser.lastName].filter(Boolean).join(' ').trim() || visitorUser.username || 'User')
                    : 'User';
                  
                  return (
                    <Link
                      key={visit.id || index}
                      href={`/profile/${visit.visitor_id || visit.visitor_user_id}`}
                      onClick={() => setShowVisitorsModal(false)}
                      className="flex items-center justify-between p-3.5 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200/70 shadow-sm group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {visitorUser?.profileImage ? (
                          <img 
                            src={visitorUser.profileImage} 
                            alt="" 
                            className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100 border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-base shadow-sm">
                            {name[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[15px] font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {visit.created_at || visit.last_visited_at 
                              ? `Visited ${new Date(visit.created_at || visit.last_visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
                              : 'Visited'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Likers Screen View */}
      {showLikersModal && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col w-full h-full max-w-lg mx-auto">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 relative bg-white shrink-0 shadow-sm">
            <button 
              onClick={() => setShowLikersModal(false)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-[18px] text-gray-900 absolute left-1/2 -translate-x-1/2">
              Profile Likes
            </h1>
            <div className="w-10 h-10 opacity-0 pointer-events-none" />
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {loadingLikers ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Loading profile likes...
              </div>
            ) : likers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-[15px] font-normal">
                No profile likes yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {likers.map((like, index) => {
                  const likerUser = like.user;
                  const name = likerUser 
                    ? (likerUser.companyName || [likerUser.firstName, likerUser.lastName].filter(Boolean).join(' ').trim() || likerUser.username || 'User')
                    : 'User';
                  
                  return (
                    <Link
                      key={like.id || index}
                      href={`/profile/${like.liker_id || like.liker_user_id}`}
                      onClick={() => setShowLikersModal(false)}
                      className="flex items-center justify-between p-3.5 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200/70 shadow-sm group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {likerUser?.profileImage ? (
                          <img 
                            src={likerUser.profileImage} 
                            alt="" 
                            className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100 border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-base shadow-sm">
                            {name[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[15px] font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {like.created_at 
                              ? `Liked ${new Date(like.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
                              : 'Liked'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
