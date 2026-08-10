"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, MoreHorizontal, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function FrequencyFeedPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [posts, setPosts] = useState<any[]>([]);
  const [frequencyName, setFrequencyName] = useState("test");
  const [frequencyBanner, setFrequencyBanner] = useState("https://images.unsplash.com/photo-1544015759-237f88e55f56?auto=format&fit=crop&q=80&w=800");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    // Attempt to load frequency name and banner from DB
    async function loadData() {
      const { fetchFrequencyById } = await import("@/lib/api/frequencies");
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      
      const freq = await fetchFrequencyById(id);
      
      if (freq) {
        setFrequencyName(freq.name);
        if (freq.image) setFrequencyBanner(freq.image);
        if (session && freq.userId === session.user.id) {
          setCanEdit(true);
        }
      }

      // Load posts for this frequency
      const { fetchPosts } = await import("@/lib/api/posts");
      const data = await fetchPosts(id);
      setPosts(data);
    }
    loadData();
  }, [id]);

  const handleLeaveFrequency = async () => {
    const { leaveFrequency } = await import("@/lib/api/frequencies");
    const success = await leaveFrequency(id);
    if (success) {
      router.push("/frequencies");
    } else {
      alert("Error leaving frequency.");
      setShowLeaveModal(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const newLiked = !post.liked;
    
    // Optimistic update
    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          liked: newLiked,
          likes: newLiked ? (p.likes || 0) + 1 : (p.likes || 1) - 1
        };
      }
      return p;
    });
    setPosts(updatedPosts);

    // Sync to Supabase
    const { toggleLike: syncLike } = await import("@/lib/api/posts");
    const success = await syncLike(postId, !newLiked);
    
    if (!success) {
      // Revert on failure
      const reverted = posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            liked: !newLiked,
            likes: !newLiked ? (p.likes || 0) + 1 : (p.likes || 1) - 1
          };
        }
        return p;
      });
      setPosts(reverted);
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-[#f8f9fa] min-h-screen pb-10 relative">
      {/* Header */}
      <header className="flex items-center py-5 px-4 relative mt-2 bg-[#f8f9fa]">
        <Link 
          href="/frequencies" 
          className="p-2.5 bg-white hover:bg-gray-100 transition-colors rounded-full shadow-sm border border-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </Link>
        <h1 className="flex-1 text-center text-[19px] font-semibold text-gray-800 pr-10">{frequencyName}</h1>
      </header>

      {/* Banner */}
      <div className="relative w-full h-[180px] shrink-0 px-4">
        <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-sm bg-gray-200">
          <img 
            src={frequencyBanner} 
            alt="Frequency Banner" 
            className="w-full h-full object-cover"
          />
          {canEdit && (
            <Link 
              href={`/frequencies/${id}/edit`}
              className="absolute top-3 right-3 bg-white text-blue-600 font-semibold text-[14px] px-5 py-1.5 rounded-full shadow-md hover:bg-gray-50 transition-colors z-10"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-3.5 px-5 mt-4 text-[14px] font-medium">
        <Link href={`/frequencies/${id}/new-post`} className="text-[#1a73e8] hover:underline">New Post</Link>
        <span className="text-gray-300 font-light">|</span>
        <Link href={`/frequencies/${id}/members`} className="text-[#1a73e8] hover:underline">Members</Link>
        <span className="text-gray-300 font-light">|</span>
        <button onClick={() => setShowLeaveModal(true)} className="text-[#ef4444] hover:underline">Leave Frequency</button>
      </div>

      {/* Posts Feed */}
      <div className="mt-6 px-4 flex flex-col gap-6">
        {posts.length === 0 && (
          <div className="mt-20 text-center text-[15px] text-gray-500 font-medium">No posts</div>
        )}
        
        {/* Dynamic Posts */}
        {posts.map((post) => (
          <div key={post.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={post.author.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=user"} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold text-gray-900">{post.author.name}</span>
                  <span className="text-[13px] text-gray-500">{post.created_at}</span>
                </div>
              </div>
              <button className="text-gray-500 hover:text-gray-800 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-4 pb-3">
              <p className="text-[14.5px] text-gray-800 whitespace-pre-wrap">{post.text}</p>
            </div>
            
            {post.image && (
              <div className="w-full">
                {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(post.image) || post.image.startsWith('data:video/') ? (
                  <video src={post.image} controls className="w-full h-auto object-cover max-h-[500px]" />
                ) : (
                  <img src={post.image} alt="Post image" className="w-full h-auto object-cover" />
                )}
              </div>
            )}
            
            {/* Post Interactions */}
            <div className="px-4 py-3 flex items-center gap-4 text-gray-500">
              <button 
                onClick={() => handleToggleLike(post.id)}
                className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <Heart className={`w-6 h-6 stroke-[1.5] ${post.liked ? 'fill-red-500' : ''}`} />
                {post.likes > 0 && <span className="text-[14px]">{post.likes}</span>}
              </button>
              <Link href={`/post/${post.id}`} className="hover:text-blue-500 transition-colors flex items-center gap-1.5 cursor-pointer">
                <MessageCircle className="w-6 h-6 stroke-[1.5]" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Frequency Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-[18px] font-bold text-gray-900 mb-2">Leave Frequency?</h2>
            <p className="text-[14.5px] text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to leave <span className="font-semibold text-gray-800">{frequencyName}</span>? You won't be able to post into this frequency or see any of its posts.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 rounded-full border border-[#1a73e8] text-[#1a73e8] font-semibold text-[15px] hover:bg-blue-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLeaveFrequency}
                className="flex-1 py-2.5 rounded-full bg-[#ef4444] text-white font-semibold text-[15px] hover:bg-red-600 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
