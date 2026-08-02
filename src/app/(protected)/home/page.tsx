"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { PostCard } from "@/components/home/post-card";
import { fetchPosts, Post } from "@/lib/api/posts";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, X, Check } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function HomeContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompanyPending, setIsCompanyPending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showReportToast, setShowReportToast] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!loading && searchParams.get("reported") === "true") {
      console.log("Home: Setting toast to true after loading finished");
      setShowReportToast(true);
      
      const timer = setTimeout(() => {
        console.log("Home: Hiding toast and clearing URL");
        setShowReportToast(false);
        router.replace(pathname, { scroll: false });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, searchParams, pathname, router]);

  useEffect(() => {
    if (searchParams.get("registered") === "true" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setShowSuccessBanner(true);
      
      // Use history API to silently clean URL without triggering Next.js router/remounts
      window.history.replaceState(null, "", "/home");
    }
  }, [searchParams]);

  useEffect(() => {
    if (showSuccessBanner && !loading) {
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner, loading]);

  useEffect(() => {
    // Ensure the page always starts at the top, fixing Next.js scroll restoration bugs
    window.scrollTo(0, 0);

    async function loadData() {
      try {
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
      } catch (err) {
        console.error("Error fetching company status:", err);
      }

      const data = await fetchPosts();
      setPosts(data);
      setLoading(false);
    }
    loadData();

    // Subscribe to new posts for real-time feed updates
    const channel = supabase
      .channel('home-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => {
          // When a new post is created, fetch the latest posts to update the UI
          fetchPosts().then(data => setPosts(data));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col gap-6 pb-20">
      {showSuccessBanner && (
        <div className="bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 rounded-[20px] flex items-center justify-between gap-4 w-full max-w-lg mx-auto animate-in slide-in-from-top-4 fade-in duration-500 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center shrink-0">
              <CheckCircle2 color="#16a34a" className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <h3 className="font-bold text-[16px] text-gray-900 leading-tight">
              Company details submitted<br />for approval
            </h3>
          </div>
          <button 
            onClick={() => setShowSuccessBanner(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {isCompanyPending && (
        <div className="bg-[#f0f6ff] border border-[#e0eaff] p-5 rounded-[16px] flex items-start gap-4 w-full max-w-lg mx-auto">
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

      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-10">No posts yet.</div>
      ) : (
        posts.map((post) => (
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
        ))
      )}

      {/* Report Toast Notification */}
      {showReportToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-3 pr-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ml-1" style={{ borderColor: '#16a34a' }}>
              <Check className="w-5 h-5 stroke-[3]" color="#16a34a" />
            </div>
            <p className="text-gray-900 font-semibold text-[15px]">Report submitted</p>
          </div>
          <button onClick={() => setShowReportToast(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <X className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f9fa]" />}>
      <HomeContent />
    </Suspense>
  );
}
