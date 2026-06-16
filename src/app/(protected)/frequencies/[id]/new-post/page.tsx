"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, Image as ImageIcon, PlaySquare } from "lucide-react";

export default function NewFrequencyPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [text, setText] = useState("");
  const [frequencyName, setFrequencyName] = useState("test");

  useEffect(() => {
    // Attempt to load frequency name
    const frequenciesList = JSON.parse(localStorage.getItem("frequencies_list") || "[]");
    const freq = frequenciesList.find((f: any) => f.id === id);
    if (freq) setFrequencyName(freq.name);
  }, [id]);

  const handlePost = async () => {
    if (!text.trim()) return;

    try {
      const { createPost } = await import("@/lib/api/posts");
      const success = await createPost(text.trim(), id);
      
      if (success) {
        router.push(`/frequencies/${id}`);
      } else {
        alert("Error creating post.");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating post.");
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-white min-h-screen px-4 py-6">
      
      {/* User Info & Frequency Pill */}
      <div className="flex items-center gap-3 mb-6">
        <img 
          src="https://api.dicebear.com/7.x/shapes/svg?seed=user" 
          alt="User Avatar" 
          className="w-12 h-12 rounded-full border border-gray-200 shadow-sm"
        />
        <div className="flex flex-col items-start gap-1">
          <span className="text-[16px] font-semibold text-gray-900">asdasd asdasd asdasd</span>
          
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
            <div className="w-[14px] h-[14px] rounded-full bg-gray-400 opacity-80" style={{ backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', backgroundSize: '3px 3px' }} />
            <span className="text-[12px] font-medium text-gray-700">{frequencyName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Post Textarea */}
      <div className="w-full border border-gray-200 rounded-2xl overflow-hidden mb-6 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full h-40 p-4 resize-none outline-none text-[15px] text-gray-800 placeholder-gray-400"
        />
      </div>

      {/* Add to your post */}
      <div className="w-full flex items-center justify-between border border-gray-200 rounded-full px-5 py-3.5 mb-10 shadow-sm">
        <span className="text-[14.5px] font-medium text-gray-600">Add to your post</span>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 hover:text-gray-800 transition-colors">
            <ImageIcon className="w-[22px] h-[22px]" />
          </button>
          <button className="text-gray-600 hover:text-gray-800 transition-colors">
            <PlaySquare className="w-[22px] h-[22px]" />
          </button>
        </div>
      </div>

      {/* Post Button */}
      <div className="mt-auto pb-10">
        <button 
          onClick={handlePost}
          disabled={!text.trim()}
          className={`w-full py-4 rounded-full font-bold text-[16px] transition-colors shadow-sm ${
            text.trim() ? "bg-[#1a73e8] hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Post
        </button>
      </div>

    </div>
  );
}
