"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Heart, MessageCircle, Send, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const MOCK_POST = {
  id: "mock",
  author: {
    name: "asdasd asdasd asdasd",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=user",
  },
  date: "Jun 12",
  text: "asdasdasd",
  image: "https://picsum.photos/seed/picsum/800/600",
  likes: 1,
  liked: true,
  comments: []
};

export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const postId = params.postId as string;

  const [post, setPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  useEffect(() => {
    if (postId === "mock") {
      setPost(MOCK_POST);
      setComments([]);
      return;
    }

    const savedPosts = JSON.parse(localStorage.getItem(`frequency_posts_${id}`) || "[]");
    const foundPost = savedPosts.find((p: any) => String(p.id) === String(postId));
    if (foundPost) {
      setPost(foundPost);
      setComments(foundPost.comments || []);
    }
  }, [id, postId]);

  const handleToggleLike = () => {
    if (!post) return;
    
    const updatedPost = {
      ...post,
      liked: !post.liked,
      likes: post.liked ? Math.max(0, (post.likes || 1) - 1) : (post.likes || 0) + 1
    };
    
    setPost(updatedPost);

    if (postId !== "mock") {
      const savedPosts = JSON.parse(localStorage.getItem(`frequency_posts_${id}`) || "[]");
      const updatedPosts = savedPosts.map((p: any) => String(p.id) === String(postId) ? updatedPost : p);
      localStorage.setItem(`frequency_posts_${id}`, JSON.stringify(updatedPosts));
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim() || !post) return;

    const newComment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      author: "asdasd asdasd asdasd",
      avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=user",
      date: "Jun 12"
    };

    const newCommentsList = [...comments, newComment];
    setComments(newCommentsList);
    setCommentText("");

    if (postId !== "mock") {
      const updatedPost = { ...post, comments: newCommentsList };
      setPost(updatedPost);
      const savedPosts = JSON.parse(localStorage.getItem(`frequency_posts_${id}`) || "[]");
      const updatedPosts = savedPosts.map((p: any) => String(p.id) === String(postId) ? updatedPost : p);
      localStorage.setItem(`frequency_posts_${id}`, JSON.stringify(updatedPosts));
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!post) return;
    
    const newCommentsList = comments.filter(c => c.id !== commentId);
    setComments(newCommentsList);
    
    if (postId !== "mock") {
      const updatedPost = { ...post, comments: newCommentsList };
      setPost(updatedPost);
      const savedPosts = JSON.parse(localStorage.getItem(`frequency_posts_${id}`) || "[]");
      const updatedPosts = savedPosts.map((p: any) => p.id === postId ? updatedPost : p);
      localStorage.setItem(`frequency_posts_${id}`, JSON.stringify(updatedPosts));
    }
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editCommentText.trim() || !post) {
      setEditingCommentId(null);
      return;
    }

    const updatedComments = comments.map(c => 
      c.id === commentId ? { ...c, text: editCommentText.trim() } : c
    );
    setComments(updatedComments);
    setEditingCommentId(null);

    if (postId !== "mock") {
      const updatedPost = { ...post, comments: updatedComments };
      setPost(updatedPost);
      const savedPosts = JSON.parse(localStorage.getItem(`frequency_posts_${id}`) || "[]");
      const savedPostsUpdated = savedPosts.map((p: any) => String(p.id) === String(postId) ? updatedPost : p);
      localStorage.setItem(`frequency_posts_${id}`, JSON.stringify(savedPostsUpdated));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleDeletePost = () => {
    if (postId !== "mock") {
      const savedPosts = JSON.parse(localStorage.getItem(`frequency_posts_${id}`) || "[]");
      const updatedPosts = savedPosts.filter((p: any) => String(p.id) !== String(postId));
      localStorage.setItem(`frequency_posts_${id}`, JSON.stringify(updatedPosts));
    }
    router.back();
  };

  if (!post) return <div className="min-h-screen bg-[#f8f9fa] flex justify-center pt-10">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto flex flex-col w-full bg-[#f8f9fa] min-h-screen pb-10">
      {/* Header */}
      <header className="flex items-center py-5 px-4 relative mt-2 bg-[#f8f9fa]">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 bg-white hover:bg-gray-100 transition-colors rounded-full shadow-sm border border-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
        </button>
      </header>

      {/* Post */}
      <div className="px-4 mt-2 flex flex-col gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Post Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-gray-900">{post.author.name}</span>
                <span className="text-[13px] text-gray-500">{post.date}</span>
              </div>
            </div>
            {/* Edit / Delete Icons */}
            <div className="flex items-center gap-3 text-gray-500">
              <button className="hover:text-gray-800 transition-colors">
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={handleDeletePost} className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Post Content */}
          <div className="px-4 pb-3">
            <p className="text-[14.5px] text-gray-800 whitespace-pre-wrap">{post.text}</p>
          </div>
          
          {/* Post Image */}
          {post.image && (
            <div className="w-full">
              <img src={post.image} alt="Post image" className="w-full h-auto object-cover" />
            </div>
          )}

          {/* Post Interactions */}
          <div className="px-4 py-3 flex items-center gap-4 text-gray-500 border-t border-gray-100 mt-2">
            <button 
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart className={`w-6 h-6 stroke-[1.5] ${post.liked ? 'fill-red-500' : ''}`} />
              {post.likes > 0 && <span className="text-[14px]">{post.likes}</span>}
            </button>
            <div className="flex items-center gap-1.5 cursor-default">
              <MessageCircle className="w-6 h-6 stroke-[1.5]" />
              {comments.length > 0 && <span className="text-[14px]">{comments.length}</span>}
            </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-3 flex items-center focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all shadow-sm">
            <input 
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type comment..."
              className="w-full outline-none text-[15px] bg-transparent text-gray-800 placeholder-gray-400"
            />
          </div>
          <button 
            onClick={handleSendComment}
            disabled={!commentText.trim()}
            className={`flex items-center justify-center w-12 h-12 rounded-full border border-blue-600 transition-all shadow-sm ${
              commentText.trim() ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="mt-2 px-1 pb-10">
          {comments.length === 0 ? (
            <p className="text-[14px] text-gray-500">Be first to comment!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <img 
                    src={comment.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=default"} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                  />
                  <div className="flex-1 bg-[#f1f3f5] rounded-2xl p-3.5 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[14px] text-gray-900 font-semibold">
                        {comment.author} <span className="text-gray-500 font-normal ml-1">• {comment.date}</span>
                      </div>
                      {comment.author === "asdasd asdasd asdasd" ? (
                        <div className="flex gap-2.5">
                          <button 
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentText(comment.text);
                            }}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <input 
                          type="text" 
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-[14.5px] outline-none focus:border-blue-500 transition-colors shadow-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(comment.id);
                            if (e.key === 'Escape') setEditingCommentId(null);
                          }}
                        />
                        <div className="flex gap-3 justify-end items-center">
                          <button 
                            onClick={() => setEditingCommentId(null)}
                            className="text-[13px] text-gray-500 hover:text-gray-800 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleSaveEdit(comment.id)}
                            className="text-[13px] text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[14.5px] text-gray-800">{comment.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
