"use client";

import { useState, useEffect } from "react";
import { PostCard } from "@/components/home/post-card";
import { fetchPosts, Post } from "@/lib/api/posts";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      const data = await fetchPosts();
      setPosts(data);
      setLoading(false);
    }
    loadPosts();
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
