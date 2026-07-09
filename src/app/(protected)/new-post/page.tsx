"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X, Info, Clock } from "lucide-react";

function NewPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');
  
  const [frequencies, setFrequencies] = useState<any[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");
  const [text, setText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("https://api.dicebear.com/7.x/shapes/svg?seed=user");
  
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isCompanyPending, setIsCompanyPending] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    async function loadFrequencies() {
      const { fetchJoinedFrequencies } = await import('@/lib/api/frequencies');
      const list = await fetchJoinedFrequencies();
      setFrequencies(list);
    }
    loadFrequencies();

    async function loadUser() {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        let avatarFetched = false;
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, crew_data')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          const crewData = profile.crew_data as any;
          if (crewData?.personal) {
            const p = crewData.personal;
            const fullName = `${p.firstName || ""} ${p.middleName || ""} ${p.lastName || ""}`.trim().replace(/\s+/g, ' ');
            setUserName(fullName || "Pilot User");
          } else {
            const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
            setUserName(fullName || "Pilot User");
          }
          if (profile.avatar_url) {
            setUserAvatar(profile.avatar_url);
            avatarFetched = true;
          }
        }
        
        // Fallback for business accounts since profiles might not be created or populated properly
        const { data: companies } = await supabase
          .from('companies')
          .select('name, logo_url')
          .eq('owner_user_id', session.user.id)
          .limit(1);
          
        if (companies && companies.length > 0) {
          if (companies[0].name) {
            setUserName(companies[0].name);
          }
          if (companies[0].logo_url && !avatarFetched) {
            setUserAvatar(companies[0].logo_url);
            avatarFetched = true;
          }
        }
        
        if (!avatarFetched) {
           const savedPhoto = localStorage.getItem("userProfilePhoto");
           if (savedPhoto) setUserAvatar(savedPhoto);
        }
      }
    }
    loadUser();

    if (editId) {
      import('@/lib/api/posts').then(({ fetchPostById }) => {
        fetchPostById(editId).then(post => {
          if (post) {
            setText(post.text || "");
            setAttachedImage(post.image || null);
            setSelectedFrequency(post.frequency_id || "");
          }
        });
      });
    }

    async function loadCompanyStatus() {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: companies } = await supabase
          .from('companies')
          .select('status')
          .eq('owner_user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (companies && companies.length > 0 && companies[0].status === 'pending') {
          setIsCompanyPending(true);
        }
      }
    }
    loadCompanyStatus();
  }, [editId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (isCompanyPending) {
      setShowPendingModal(true);
      return;
    }
    if (!text.trim() && !attachedImage) return;

    setIsPosting(true);
    
    try {
      const { createPost, updatePost } = await import('@/lib/api/posts');
      let success = false;
      
      if (editId) {
        // Only pass attachedImage if there's no new imageFile, to keep existing image
        success = await updatePost(editId, text.trim(), selectedFrequency || undefined, imageFile || undefined, imageFile ? null : attachedImage);
      } else {
        success = await createPost(text.trim(), selectedFrequency || undefined, imageFile || undefined);
      }
      
      if (success) {
        router.push("/home");
      } else {
        alert("Error saving post. Check your connection or permissions.");
      }
    } catch (e: any) {
      if (e.message === "NOT_LOGGED_IN") {
        alert("You are not logged in. Redirecting to login page...");
        router.push("/login");
      } else {
        console.error(e);
        alert("Error creating post.");
      }
    } finally {
      setIsPosting(false);
    }
  };

  const currentFreq = frequencies.find(f => f.id === selectedFrequency);

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full min-h-[calc(100vh-88px)] px-4 pt-4 pb-10">
      
      {isCompanyPending && (
        <div className="bg-[#f0f6ff] border border-[#e0eaff] p-5 rounded-[16px] flex items-start gap-4 w-full mb-6">
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

      {/* User Info & Frequency Selector */}
      <div className="flex items-center gap-3 mb-6 relative">
        <img 
          src={userAvatar} 
          alt="Avatar" 
          className="w-[42px] h-[42px] rounded-full border border-gray-200 object-cover"
        />
        <div className="flex flex-col items-start">
          <span className="text-[15px] font-bold text-gray-900">{userName}</span>
          
          <div className="relative mt-1">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors rounded-full text-[12px] font-semibold text-gray-700 shadow-sm"
            >
              {currentFreq ? currentFreq.name : "Select Frequency"}
              {currentFreq ? (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFrequency("");
                  }}
                  className="hover:bg-gray-200 rounded-full p-0.5 transition-colors flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-gray-600" />
                </div>
              ) : (
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {isDropdownOpen && frequencies.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-2 max-h-[200px] overflow-y-auto">
                {frequencies.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFrequency(f.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <img 
                      src={f.icon || "https://api.dicebear.com/7.x/shapes/svg?seed=" + f.id} 
                      alt="" 
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="mb-4 flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full h-[140px] text-[15px] text-gray-800 placeholder-gray-400 outline-none resize-none bg-white border border-gray-300 rounded-[18px] p-5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
        />
        {attachedImage && (
          <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {attachedImage.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(attachedImage) ? (
              <video src={attachedImage} controls className="w-full h-auto object-cover max-h-[300px]" />
            ) : (
              <img src={attachedImage} alt="Attached" className="w-full h-auto object-cover max-h-[300px]" />
            )}
            <button 
              onClick={() => setAttachedImage(null)}
              className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border border-gray-300 bg-white rounded-full px-5 py-3.5 mb-8 shadow-sm">
        <span className="text-[15px] font-semibold text-gray-700">Add to your post</span>
        <div className="flex items-center gap-5 text-[#4A4A4A]">
          <input 
            type="file" 
            accept="image/*,video/*" 
            hidden 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
          <button onClick={() => fileInputRef.current?.click()} className="hover:text-gray-900 transition-colors">
            <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24">
              <rect x="1" y="2" width="22" height="20" rx="4" fill="currentColor" />
              <circle cx="16" cy="8" r="2" fill="white" />
              <path d="M1 17L8 10L14 16L18 12L23 18V18C23 20.2091 21.2091 22 19 22H5C2.79086 22 1 20.2091 1 18V17Z" fill="white" />
            </svg>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="hover:text-gray-900 transition-colors">
            <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24">
              <rect x="1" y="3" width="22" height="15" rx="3" fill="currentColor" />
              <polygon points="10,7 16,10.5 10,14" fill="white" />
              <rect x="1" y="20" width="22" height="2.5" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Post Button */}
      <button 
        onClick={handlePost}
        disabled={isPosting || (!text.trim() && !attachedImage)}
        className={`w-full py-3.5 mt-auto rounded-full font-bold text-[16px] transition-all shadow-sm ${
          text.trim() || attachedImage ? "bg-[#1a73e8] text-white hover:bg-blue-700" : "bg-[#1a73e8] text-white opacity-50 cursor-not-allowed"
        }`}
      >
        <span className="font-bold text-[15px]">{isPosting ? (editId ? "Updating..." : "Posting...") : (editId ? "Update" : "Post")}</span>
      </button>

      {/* Loading Overlay */}
      {isPosting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {showPendingModal && (
        <div className="fixed top-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-[100]">
          <div className="bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 p-5 relative">
            <button onClick={() => setShowPendingModal(false)} className="absolute top-5 right-5 text-gray-800 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-3">
              <Info className="w-[22px] h-[22px] text-[#1a73e8] shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="flex-1 pr-6">
                <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">Company profile under review</h3>
                <p className="text-[14px] text-gray-600 leading-snug">
                  Your company profile is being reviewed. Posting, commenting, liking, and creating Frequencies are disabled until approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default function GlobalNewPostPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <NewPostContent />
    </Suspense>
  );
}
