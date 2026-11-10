"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, Image as ImageIcon, PlaySquare, ArrowLeft, BarChart2 } from "lucide-react";
import Link from "next/link";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { PollCreator, PollCreatorState } from "@/components/polls/poll-creator";
import { fetchFrequencyById } from "@/lib/api/frequencies";
import { supabase } from "@/lib/supabase";

export default function NewFrequencyPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [text, setText] = useState("");
  const [frequencyName, setFrequencyName] = useState("Frequency");
  const [userName, setUserName] = useState("Member");
  const [userAvatar, setUserAvatar] = useState("https://api.dicebear.com/7.x/shapes/svg?seed=user");
  const [pollState, setPollState] = useState<PollCreatorState | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      // 1. Load frequency name
      const freq = await fetchFrequencyById(id);
      if (freq) setFrequencyName(freq.name);

      // 2. Load user info
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: u } = await supabase
          .from("users")
          .select("firstName, lastName, profileImage, username")
          .eq("id", authData.user.id)
          .maybeSingle();

        const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() || u?.username || "Member";
        setUserName(name);
        if (u?.profileImage) setUserAvatar(u.profileImage);
      }
    }
    loadInfo();
  }, [id]);

  const handleTogglePoll = () => {
    if (pollState) {
      setPollState(null);
    } else {
      setPollState({
        options: ["", ""],
        duration: "24h",
      });
    }
  };

  const handlePost = async () => {
    const validPollOptions = pollState ? pollState.options.map(o => o.trim()).filter(Boolean) : [];
    if (pollState) {
      if (validPollOptions.length < 2) {
        alert("Polls must contain at least 2 non-empty options.");
        return;
      }
      if (validPollOptions.length > 4) {
        alert("Polls cannot contain more than 4 options.");
        return;
      }
    }

    if ((!text.trim() && (!pollState || validPollOptions.length < 2)) || isPosting) return;
    setIsPosting(true);

    try {
      const { createPost } = await import("@/lib/api/posts");
      const res = await createPost(
        text.trim(),
        id,
        undefined,
        pollState ? { options: validPollOptions, duration: pollState.duration } : undefined
      );
      
      if (res.success) {
        router.push(`/frequencies/${id}`);
      } else {
        alert(res.error || "Error creating post.");
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error creating post.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-white min-h-screen px-4 py-6">
      {/* Top back button */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/frequencies/${id}`}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Create Post in {frequencyName}</h1>
      </div>

      {/* User Info & Frequency Pill */}
      <div className="flex items-center gap-3 mb-6">
        <img 
          src={userAvatar} 
          alt={userName} 
          className="w-12 h-12 rounded-full border border-gray-200 object-cover shadow-xs"
        />
        <div className="flex flex-col items-start gap-1">
          <span className="text-[16px] font-semibold text-gray-900">{userName}</span>
          
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full">
            <span className="text-[12px] font-medium text-gray-700">{frequencyName}</span>
          </div>
        </div>
      </div>

      {/* Post Textarea with HU-04 Mention Autocomplete */}
      <div className="w-full border border-gray-200 rounded-2xl p-4 mb-4 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <MentionTextarea
          value={text}
          onChange={setText}
          frequencyId={id}
          placeholder="What's on your mind? Type @ to mention a group member..."
          rows={5}
        />
      </div>

      {/* Feed Poll Creator (HU-07: Media Exclusivity) */}
      {pollState && (
        <div className="mb-4">
          <PollCreator
            pollState={pollState}
            onChange={setPollState}
            onRemove={() => setPollState(null)}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-2.5 mb-6 shadow-xs">
        <span className="text-[14px] font-medium text-gray-600">Add to your post</span>
        <button
          type="button"
          onClick={handleTogglePoll}
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            pollState
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-blue-600 hover:bg-white"
          }`}
          title={pollState ? "Remove poll" : "Create a poll"}
        >
          <BarChart2 className="w-4 h-4" />
          <span>{pollState ? "Poll Added" : "Poll"}</span>
        </button>
      </div>

      {/* Post Button */}
      <div className="mt-auto pb-10">
        <button 
          onClick={handlePost}
          disabled={(!text.trim() && (!pollState || pollState.options.filter(o => o.trim()).length < 2)) || isPosting}
          className={`w-full py-3.5 rounded-full font-bold text-[16px] transition-colors shadow-xs ${
            (text.trim() || (pollState && pollState.options.filter(o => o.trim()).length >= 2)) && !isPosting
              ? "bg-[#1a73e8] hover:bg-blue-700 text-white cursor-pointer"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isPosting ? "Posting..." : "Post"}
        </button>
      </div>

    </div>
  );
}
