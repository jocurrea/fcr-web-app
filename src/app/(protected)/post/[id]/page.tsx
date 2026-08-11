"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit2, Trash2, Send, X, Check, Flag, Forward, Info, Clock } from "lucide-react";
import { PostCard } from "@/components/home/post-card";
import { fetchPostById, fetchPostComments, createComment, deleteComment, deletePost, updateComment, Post, Comment } from "@/lib/api/posts";
import { supabase } from "@/lib/supabase";

import { Suspense } from "react";

function PostDetailContent() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [commentText, setCommentText] = useState("");
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [showReportToast, setShowReportToast] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && searchParams.get("reported") === "true") {
      setShowReportToast(true);
      
      const timer = setTimeout(() => {
        setShowReportToast(false);
        router.replace(pathname, { scroll: false });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, searchParams, pathname, router]);
  const [isCompanyPending, setIsCompanyPending] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadData() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setCurrentUserId(userData.user.id);
        const { data: companies } = await supabase
          .from('companies')
          .select('status')
          .eq('owner_user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (companies && companies.length > 0 && companies[0].status === 'pending') {
          setIsCompanyPending(true);
        }
      }

      const postData = await fetchPostById(id);
      if (postData) {
        setPost(postData);
        const commentsData = await fetchPostComments(id);
        setComments(commentsData);
      }
      setLoading(false);
    }
    
    if (id) {
      loadData();
    }
  }, [id]);

  const handleAddComment = async () => {
    if (isCompanyPending) {
      alert("Comentar está deshabilitado mientras su empresa está pendiente de aprobación. (Commenting disabled while pending approval)");
      return;
    }
    if (!commentText.trim() || !post) return;

    const text = commentText.trim();
    setCommentText(""); // clear input optimistically
    
    try {
      const success = await createComment(id, text);
      if (success) {
        const commentsData = await fetchPostComments(id);
        setComments(commentsData);
      } else {
        alert("Error adding comment");
      }
    } catch (error) {
      console.error("Error al crear comentario:", error);
      alert("Error de conexión al guardar el comentario.");
    }
  };

  const handleDeleteCommentClick = (commentId: string) => {
    setCommentToDelete(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    
    const success = await deleteComment(commentToDelete);
    if (success) {
      setComments(comments.filter(c => c.id !== commentToDelete));
    } else {
      alert("Error deleting comment");
    }
    setCommentToDelete(null);
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;

    const success = await updateComment(editingCommentId, editingCommentText.trim());
    if (success) {
      setComments(comments.map(c => 
        c.id === editingCommentId ? { ...c, text: editingCommentText.trim() } : c
      ));
      setEditingCommentId(null);
      setEditingCommentText("");
    } else {
      alert("Error updating comment");
    }
  };

  const handleDeletePostClick = () => {
    setShowDeletePostModal(true);
  };

  const confirmDeletePost = async () => {
    try {
      const success = await deletePost(id);
      if (success) {
        router.refresh(); // Refresh to invalidate cache
        setTimeout(() => router.back(), 100);
      } else {
        alert("Error deleting post");
        setShowDeletePostModal(false);
      }
    } catch (error) {
      console.error("Delete post error:", error);
      alert("Error de conexión.");
      setShowDeletePostModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] px-4 text-center">
        <p className="text-gray-500 mt-4 text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] px-4 text-center">
        <p className="text-gray-500 mt-4 text-lg font-semibold">Post not found</p>
        <button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full font-medium">Go back</button>
      </div>
    );
  }

  const isPostOwner = currentUserId === post.user_id;

  return (
    <div className="min-h-screen bg-white md:bg-[#f8f9fa] flex flex-col pt-6 pb-24">
      <div className="px-4 max-w-lg mx-auto w-full relative flex flex-col gap-4">
        
        {/* Back Button */}
        <div className="flex items-center">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
        </div>

        {/* Post Card Area */}
        <div className="relative">
          {/* Post Actions overlay on top right of the card */}
          {isPostOwner && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-white pl-2">
              <button onClick={() => router.push(`/new-post?edit=${post.id}`)} className="text-gray-500 hover:text-gray-700">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={handleDeletePostClick} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <PostCard 
            id={post.id}
            user={{
              id: post.user_id,
              name: post.author?.name || "User",
              avatar: post.author?.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=user",
            }}
            date={post.created_at}
            content={post.text}
            image={post.image || undefined}
            likes={post.likes}
            liked={post.liked}
            comments={comments.length}
            hideActions={true}
          />
        </div>

        {/* Comment Input */}
        {isCompanyPending ? (
          <div className="bg-[#f0f6ff] border border-[#e0eaff] p-4 rounded-[16px] flex items-start gap-3 w-full mt-1">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Clock className="w-4 h-4 text-[#1a56db]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-[14px] text-gray-900 mb-0.5">Company under review</h3>
              <p className="text-[13px] text-gray-500 leading-snug">
                Commenting is disabled until approval.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1">
              <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Write a comment..."
                className="w-full border border-gray-300 rounded-full px-5 py-2.5 text-[13.5px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-gray-700"
              />
            </div>
            <button 
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors border-2 ${
                commentText.trim() ? "border-[#1a73e8] text-[#1a73e8] bg-white hover:bg-blue-50" : "border-[#1a73e8] text-[#1a73e8] bg-white opacity-50"
              }`}
            >
              <Send className="w-[18px] h-[18px] ml-[-2px]" />
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="mt-1">
          {comments.length === 0 ? (
            <p className="text-[13px] text-gray-600 font-medium text-center py-4">Be the first to comment!</p>
          ) : (
            <div className="flex flex-col gap-4 mt-2">
              {comments.map((c, i) => {
                const isCommentOwner = currentUserId === c.user_id;
                const isEditing = editingCommentId === c.id;

                return (
                  <div key={c.id || i} className="flex gap-3 items-start">
                    {/* Avatar */}
                    <Link href={`/profile/${c.user_id}`} className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-blue-600 flex-shrink-0 mt-1 hover:opacity-80 transition-opacity flex items-center justify-center text-white font-bold text-sm uppercase">
                      {c.author?.avatar && !c.author.avatar.includes('shapes') ? (
                        <img 
                          src={c.author.avatar} 
                          alt={c.author.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span>{(c.author?.name || 'U')[0]?.toUpperCase()}</span>
                      )}
                    </Link>
                    {/* Gray Box */}
                    <div className="flex-1 bg-[#f1f3f4] p-3 rounded-2xl rounded-tl-sm relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link href={`/profile/${c.user_id}`} className="font-bold text-[13.5px] text-gray-900 hover:text-blue-600 transition-colors">
                            {c.author.name}
                          </Link>
                          <span className="text-gray-400 text-[10px]">●</span>
                          <span className="text-[12px] text-gray-500 font-medium">{c.created_at}</span>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2.5 text-gray-400 ml-2">
                          {!isCommentOwner && (
                            <Link href={`/report-comment/${c.id}?returnTo=${encodeURIComponent(pathname)}`} className="text-gray-400 hover:text-red-500 transition-colors" title="Report">
                              <Flag className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {isCommentOwner && !isEditing && (
                            <>
                              <button onClick={() => startEditingComment(c)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteCommentClick(c.id)} className="text-red-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input 
                            type="text" 
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedComment()}
                            autoFocus
                            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-[13.5px] outline-none focus:border-blue-500"
                          />
                          <button onClick={saveEditedComment} className="w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEditingComment} className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full flex items-center justify-center transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[14px] text-gray-800 mt-1 leading-snug">{c.text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Delete Comment Modal */}
      {commentToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-[320px] w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Delete Comment</h3>
            <p className="text-gray-500 text-[14px] leading-relaxed mb-6">Are you sure you want to delete this comment?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setCommentToDelete(null)}
                className="px-5 py-2.5 rounded-full font-semibold text-[14px] text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteComment}
                className="px-5 py-2.5 rounded-full font-semibold text-[14px] text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Modal */}
      {showDeletePostModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-[320px] w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Delete Post</h3>
            <p className="text-gray-500 text-[14px] leading-relaxed mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeletePostModal(false)}
                className="px-5 py-2.5 rounded-full font-semibold text-[14px] text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePost}
                className="px-5 py-2.5 rounded-full font-semibold text-[14px] text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Toast Notification */}
      {showReportToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-3 pr-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
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

export default function PostDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] px-4 text-center"><p className="text-gray-500 mt-4 text-lg font-semibold">Loading...</p></div>}>
      <PostDetailContent />
    </Suspense>
  );
}
