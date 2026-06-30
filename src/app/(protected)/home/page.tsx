"use client";

import { useState, useEffect } from "react";
import { PostCard } from "@/components/home/post-card";
import { fetchPosts, Post } from "@/lib/api/posts";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompanyPending, setIsCompanyPending] = useState(false);

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
    </div>
  );
}
