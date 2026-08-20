"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/home/post-card";
import { MapPin, Pencil, Clock, Heart, Eye, User, X, ChevronRight, ChevronLeft, Phone, Mail, Globe, Calendar, FileText, Briefcase, Plane, Building2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { fetchProfileProgress } from "@/lib/profile-progress";
import { fetchPosts } from "@/lib/api/posts";
import { ProfileProgressWidget } from "@/components/profile/profile-progress-widget";
import { ProgressAvatar } from "@/components/profile/progress-avatar";

export default function ProfilePage() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  const [personal, setPersonal] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [work, setWork] = useState<any>(null);
  const [languages, setLanguages] = useState<{name: string, proficiency: string}[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);

  // Account type — drives which profile layout to show
  const [accountType, setAccountType] = useState<string>("");
  // Business Profile State
  const [isBusiness, setIsBusiness] = useState(false);
  const [isAviationProfessional, setIsAviationProfessional] = useState(false);
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
        .eq('profile_user_id', currentUserId)
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
    if (!currentUserId) return;
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      let { data: likesData } = await supabase
        .from('profile_likes')
        .select('*')
        .eq('profile_user_id', currentUserId)
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
            supabase.from('users').select('accountType, profileImage').eq('id', session.user.id).maybeSingle(),
            supabase.from('resumes').select('data').eq('userId', session.user.id).maybeSingle()
          ]);

          const profileImage = userRes.data?.profileImage || null;
          const crewData = resumeRes.data?.data || null;

          // Determine accountType with multiple fallbacks in priority order:
          // 1. Supabase auth metadata or localStorage if explicitly set to aviation_professional / business
          // 2. DB users.accountType
          // 3. Fallback default
          const localPersonalRaw = localStorage.getItem("onboarding_personal");
          const localPersonalForType = localPersonalRaw ? JSON.parse(localPersonalRaw) : null;

          const dbAccountType = userRes.data?.accountType || "";
          const authAccountType = session.user.user_metadata?.accountType || "";
          const localAccountType = localPersonalForType?.category || localPersonalForType?.role || "";

          let resolvedAccountType = "flight_crew";
          if (authAccountType === "aviation_professional" || localAccountType === "aviation_professional" || dbAccountType === "aviation_professional") {
            resolvedAccountType = "aviation_professional";
          } else if (authAccountType === "business" || dbAccountType === "business") {
            resolvedAccountType = "business";
          } else if (dbAccountType === "flight_crew" || authAccountType === "flight_crew" || localAccountType === "flight_crew") {
            resolvedAccountType = "flight_crew";
          }

          // If the database record is out of sync with resolvedAccountType, update DB immediately
          if (dbAccountType !== resolvedAccountType && session?.user?.id) {
            supabase.from("users").update({ accountType: resolvedAccountType }).eq("id", session.user.id).then();
          }

          console.log("[Profile] accountType resolution:\n" + JSON.stringify({ dbAccountType, authAccountType, localAccountType, resolved: resolvedAccountType }, null, 2));

          setAccountType(resolvedAccountType);

          if (resolvedAccountType === "aviation_professional") {
            setIsAviationProfessional(true);
          } else {
            setIsAviationProfessional(false);
          }

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

          if (resolvedAccountType === "business") {
            // Check if user has a business company
            const { data: companies, error } = await supabase
              .from('companies')
              .select('id, name, status, logo_url, location, contact_email, phone, website, description, founded_year, operating_areas, services, fleet_types')
              .eq('owner_user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (error) {
              console.error("Error fetching companies:", error);
            }

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

            const companyLogo = comp.logo_url || profileImage || localStorage.getItem("userProfilePhoto");
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
            if (companyLogo) {
              setProfilePhoto(companyLogo);
            }
          }
          } // close if (userRes.data?.accountType === "business")
          
          if (userRes.data?.accountType !== "business" && !profileImage) {
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
                    <Link href="/onboarding-business" className="border border-[#1d6bf3] text-[#1d6bf3] hover:bg-blue-50 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Link>
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
        {isPending && (
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
          <div className="bg-white rounded-[24px] p-6 flex flex-col shadow-sm border border-gray-100 gap-4">
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

        {/* Visitors Screen View */}
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

        {/* Likers Screen View */}
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

  // ==============================
  // AVIATION PROFESSIONAL PROFILE VIEW
  // (Operations Officers, ATCs, Mechanics, Engineers, etc.)
  // ==============================
  if (accountType === "aviation_professional") {
    const professionalRoleLabels: Record<string, string> = {
      operations_officer: "Operations Officer",
      aircraft_mechanic: "Aircraft Mechanic",
      air_traffic_controller: "Air Traffic Controller",
      aeronautical_engineer: "Aeronautical Engineer",
      other: "Aviation Professional",
    };

    const rawFirstName = personal?.firstName || "Margare";
    const rawLastName = personal?.lastName || "Perez";
    const fullName = `${personal?.firstName || ""} ${personal?.lastName || ""}`.trim() || `${rawFirstName} ${rawLastName}`;

    const rawRoleKey = personal?.professionalRole || personal?.professionalType || personal?.selectedRole || personal?.category || "operations_officer";
    const roleTitle =
      personal?.professionalTitle ||
      professionalRoleLabels[rawRoleKey] ||
      (typeof rawRoleKey === "string" ? rawRoleKey.replace(/_/g, " ") : "Operations Officer");

    const summaryText =
      personal?.aboutMe ||
      personal?.description ||
      personal?.summary ||
      resume?.summary ||
      resume?.about ||
      "Aviation Operations Specialist with extensive experience in flight scheduling, safety compliance, and crew coordination across commercial airlines.";

    const avatarUrl = profilePhoto || personal?.profileImage || personal?.avatar;

    const rawStatus =
      personal?.status ||
      personal?.approvalStatus ||
      personal?.availabilityStatus ||
      "active";
    const isApproved = rawStatus === "active" || rawStatus === "approved";
    const isPending = !isApproved;

    const statusBadgeText = isPending ? "Pending" : "Active";
    const statusBadgeStyle = isPending
      ? "bg-orange-100 text-orange-700 border border-orange-200/80"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200/70";
    const statusDotStyle = isPending ? "bg-orange-500" : "bg-emerald-500";

    const linkedCompany =
      personal?.linkedCompany ||
      personal?.companyName ||
      personal?.companyLink ||
      personal?.company ||
      "Global Airways";
    const companyName =
      typeof linkedCompany === "string"
        ? linkedCompany
        : linkedCompany?.name || "Global Airways";
    const companyHref =
      typeof linkedCompany === "object" && linkedCompany?.id
        ? `/profile/${linkedCompany.id}`
        : typeof linkedCompany === "string" && linkedCompany.startsWith("http")
        ? linkedCompany
        : "#";

    const locationValue =
      personal?.location ||
      personal?.cityCountry ||
      personal?.selectedCountry ||
      "Miami, United States";

    const emailValue = personal?.email || "margare.perez@flightcrew.com";
    const phoneValue = personal?.phone || "+1 (305) 555-0149";
    const licenseValue =
      personal?.licenseCertification ||
      (Array.isArray(personal?.licenses) ? personal.licenses.join(", ") : personal?.licenses) ||
      (licenses.length > 0 ? licenses.map((l: any) => l.licenseName || l.name).join(", ") : "FAA Dispatcher Certificate (ADX), ICAO Flight Operations Officer");

    const workExperiences = Array.isArray(personal?.workExperiences)
      ? personal.workExperiences
      : Array.isArray(work)
      ? work
      : [];
    let experienceValue = "7+ years • Senior Operations Officer at Global Airways";
    if (workExperiences.length > 0) {
      const firstExp = workExperiences[0];
      const expParts = [firstExp.roleTitle || firstExp.jobTitle, firstExp.companyName || firstExp.company].filter(Boolean);
      if (expParts.length > 0) {
        const dateRange = [firstExp.startDate, firstExp.endDate].filter(Boolean).join(" - ");
        experienceValue = `${expParts.join(" at ")}${dateRange ? ` (${dateRange})` : ""}`;
      }
    } else if (personal?.experience || personal?.industryYears) {
      experienceValue = personal.experience || `${personal.industryYears} years in aviation`;
    }

    let languagesValue = "English (Native), Spanish (Fluent), French (Basic)";
    const profLanguages = personal?.languages || languages || resume?.languages;
    if (profLanguages && Array.isArray(profLanguages) && profLanguages.length > 0) {
      languagesValue = profLanguages
        .map((l: any) => (typeof l === "string" ? l : `${l.name || l.label || l}${l.proficiency ? ` (${l.proficiency})` : ""}`))
        .join(", ");
    }

    const defaultSkills = [
      "Flight Operations",
      "Safety Management",
      "Compliance",
      "Crew Scheduling",
      "Avionics",
      "Aerodynamics",
    ];
    let skillsList: string[] = defaultSkills;
    if (personal?.skills && Array.isArray(personal.skills) && personal.skills.length > 0) {
      skillsList = personal.skills.map((s: any) => (typeof s === "string" ? s : s.name));
    } else if (personal?.structuredSkills && Array.isArray(personal.structuredSkills)) {
      skillsList = personal.structuredSkills.map((s: any) => s.name);
    } else if (resume?.skills && Array.isArray(resume.skills) && resume.skills.length > 0) {
      skillsList = resume.skills.map((s: any) => (typeof s === "string" ? s : s.name));
    }

    return (
      <div className="min-h-screen bg-[#f8f9fa] py-6 px-4">
        {/* Centered Mobile-Width Container */}
        <div className="max-w-md mx-auto flex flex-col gap-4">

          {/* ========================================================
              CARD 1: Profile Header (Horizontal Layout, NO cover photo)
              ======================================================== */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs relative flex flex-row items-start gap-5 sm:gap-6 text-left">
            
            {/* Top-Right Absolute Action Container: Active/Pending Badge + Edit Pencil */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap",
                  statusBadgeStyle
                )}
              >
                {statusBadgeText}
              </span>

              <Link
                href="/onboarding?edit=true&category=aviation_professional"
                className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 border border-gray-200/80 flex items-center justify-center text-gray-500 hover:text-[#1d4ed8] transition-colors cursor-pointer shrink-0"
                title="Edit Profile"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Avatar Container: Left-aligned with Solid Status Dot */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1d4ed8] text-white font-extrabold flex items-center justify-center text-2xl sm:text-3xl">
                    {rawFirstName[0]?.toUpperCase() || "A"}
                  </div>
                )}
              </div>

              {/* Status Dot (Bottom-Right of Avatar: Orange if Pending, Green if Active) */}
              <span
                className={cn("absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white shadow-xs", statusDotStyle)}
                title={statusBadgeText}
              />
            </div>

            {/* Information Container: Strictly left-aligned vertical stack */}
            <div className="flex flex-col items-start text-left justify-center flex-grow min-w-0 pr-24 gap-1.5">
              {/* Full Name: Large & Bold */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight break-words text-left">
                {fullName}
              </h1>

              {/* Role Pill */}
              <div className="w-fit">
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-[#eff6ff] text-[#1d4ed8] whitespace-nowrap">
                  {roleTitle}
                </span>
              </div>

              {/* Company Link */}
              <div className="w-fit">
                <Link
                  href={companyHref}
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium cursor-pointer hover:underline transition-colors w-fit"
                  title={`View ${companyName} profile`}
                >
                  <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">{companyName}</span>
                </Link>
              </div>

              {/* Professional Summary */}
              {summaryText && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal text-left mt-0.5">
                  {summaryText}
                </p>
              )}
            </div>

          </div>

          {/* ========================================================
              CARD 2: Progress Widget (Profile Completion)
              ======================================================== */}
          <div className="w-full">
            <ProfileProgressWidget
              profileData={{
                personal,
                user: { email: emailValue },
                languages: profLanguages,
                work,
                licenses,
                certifications: ratings,
                avatar: avatarUrl,
                skills: skillsList,
              }}
            />
          </div>

          {/* ========================================================
              CARD 3: Professional Details (Structured Vertical List)
              ======================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
              Professional details
            </h2>

            <div className="space-y-5">
              {/* 1. Location */}
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-400 font-medium leading-none">Location</span>
                  <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                    {locationValue}
                  </span>
                </div>
              </div>

              {/* 2. Email */}
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-400 font-medium leading-none">Email</span>
                  <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                    {emailValue}
                  </span>
                </div>
              </div>

              {/* 3. Phone */}
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-400 font-medium leading-none">Phone</span>
                  <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                    {phoneValue}
                  </span>
                </div>
              </div>

              {/* 4. License / Certification */}
              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-400 font-medium leading-none">License / Certification</span>
                  <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                    {licenseValue}
                  </span>
                </div>
              </div>

              {/* 5. Experience */}
              <div className="flex items-start gap-4">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-400 font-medium leading-none">Experience</span>
                  <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                    {experienceValue}
                  </span>
                </div>
              </div>

              {/* 6. Languages */}
              <div className="flex items-start gap-4">
                <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0 mt-0.5 stroke-[1.8]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-400 font-medium leading-none">Languages</span>
                  <span className="text-base sm:text-[17px] font-semibold text-gray-900 break-words leading-snug mt-1">
                    {languagesValue}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              CARD 3: Skills & Expertise
              ======================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Skills & Expertise
            </h2>

            <div className="flex flex-wrap gap-2.5">
              {skillsList.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 sm:px-5 sm:py-2 rounded-full bg-gray-100 text-gray-800 text-sm sm:text-base font-medium border border-gray-200/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* User Posts if any */}
          {userPosts.length > 0 && (
            <div className="mt-2 flex flex-col gap-3">
              <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest px-1">Posts</h2>
              {userPosts.map((post: any) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  user={{
                    name: post.author?.name || fullName,
                    avatar: post.author?.avatar || avatarUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=user",
                  }}
                  date={post.created_at}
                  content={post.text}
                  image={post.image || undefined}
                  likes={post.likes}
                  liked={post.liked}
                  comments={post.comments}
                />
              ))}
            </div>
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
      <div className="w-full flex justify-center -mt-20 mb-4 relative z-20">
        {isAviationProfessional ? (
          <div className="relative flex items-center justify-center p-1.5 bg-white rounded-full shadow-xl" style={{ width: 156, height: 156 }}>
            {/* Avatar Photo Without SVG Ring */}
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 z-10">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
              )}
            </div>
            
            {/* Edit Icon */}
            <Link href="/onboarding?edit=true" className="absolute bottom-0 right-0 w-9 h-9 bg-white border-2 border-white rounded-full flex items-center justify-center shadow-lg text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer z-50">
              <Pencil className="w-[16px] h-[16px]" />
            </Link>
          </div>
        ) : (
          <ProgressAvatar 
            size={156} 
            percentage={profileProgress} 
            imageUrl={profilePhoto} 
            showEditIcon={true} 
            editLink="/onboarding?edit=true" 
          />
        )}
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

        {isAviationProfessional && (
          <div className="w-full">
            <ProfileProgressWidget 
              profileData={{
                personal,
                user: { email: personal?.email },
                languages,
                work,
                licenses,
                certifications: ratings,
                avatar: profilePhoto,
                skills,
              }}
            />
          </div>
        )}
        
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
