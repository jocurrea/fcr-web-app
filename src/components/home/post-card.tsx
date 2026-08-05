import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Heart, MessageCircle, Flag, Forward, X, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostCardProps {
  id?: string;
  user: {
    id?: string;
    name: string;
    avatar: string;
  };
  date: string;
  content: string;
  image?: string;
  likes: number;
  liked?: boolean;
  comments: number;
  hideActions?: boolean;
}

export function PostCard({ id, user, date, content, image, likes, liked, comments, hideActions }: PostCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLiked, setIsLiked] = useState(liked || false);
  const [likeCount, setLikeCount] = useState(likes || 0);

  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likersList, setLikersList] = useState<any[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);

  useEffect(() => {
    setIsLiked(liked || false);
    setLikeCount(likes || 0);
  }, [liked, likes]);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.id) {
      router.push(`/profile/${user.id}`);
    }
  };

  const toggleLike = async () => {
    if (!id) return; // For mock posts without id

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    setLikeCount(newCount);

    // Sync to Supabase
    const { toggleLike: syncLike } = await import('@/lib/api/posts');
    const success = await syncLike(id, !newLiked); // pass current state before toggle
    if (!success) {
      // Revert if failed
      setIsLiked(!newLiked);
      setLikeCount(newLiked ? newCount - 1 : newCount + 1);
    }
  };

  const handleOpenLikers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || likeCount === 0) return;
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      const { fetchPostLikers } = await import('@/lib/api/posts');
      const data = await fetchPostLikers(id);
      setLikersList(data);
    } catch (err) {
      console.error('Error fetching post likers:', err);
    } finally {
      setLoadingLikers(false);
    }
  };

  const handleCommentClick = () => {
    if (id) {
      router.push(`/post/${id}`);
    }
  };

  const handleMoreClick = () => {
    if (id) {
      router.push(`/post/${id}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div 
          onClick={handleProfileClick}
          className={cn("flex items-center gap-3", user.id ? "cursor-pointer group" : "")}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900 leading-none group-hover:text-blue-600 transition-colors">{user.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{date}</p>
          </div>
        </div>
        {!hideActions && (
          <button onClick={handleMoreClick} className="text-gray-400 hover:text-gray-600 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 text-sm">{content}</p>
        </div>
      )}

      {/* Image / Video */}
      {image && (
        <div className="w-full">
          {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(image) || image.startsWith('data:video/') ? (
            <video src={image} controls className="w-full object-cover max-h-[500px]" />
          ) : (
            <img src={image} alt="Post content" className="w-full object-cover max-h-[500px]" />
          )}
        </div>
      )}

      {/* Footer / Actions */}
      <div className="p-4 flex items-center gap-6 border-t border-gray-50/50 text-gray-500">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={toggleLike}
            className="hover:text-red-500 transition-colors group cursor-pointer"
            title="Like post"
          >
            <Heart className={`w-[22px] h-[22px] ${isLiked ? "fill-red-500 text-red-500" : "group-hover:fill-red-500"}`} />
          </button>
          {likeCount > 0 && (
            <span 
              onClick={handleOpenLikers}
              className="text-sm font-semibold text-gray-700 hover:text-red-500 hover:underline cursor-pointer transition-colors"
              title="See who liked this post"
            >
              {likeCount}
            </span>
          )}
        </div>

        <button 
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-[22px] h-[22px]" />
          {(comments || 0) > 0 && <span className="text-sm font-medium">{comments}</span>}
        </button>

        <button onClick={() => alert("Share functionality coming soon")} className="hover:text-blue-500 transition-colors" title="Share">
          <Forward className="w-[22px] h-[22px]" />
        </button>

        <Link href={`/report-post/${id}?returnTo=${encodeURIComponent(pathname)}`} className="hover:text-red-500 transition-colors" title="Report">
          <Flag className="w-[20px] h-[20px]" />
        </Link>
      </div>

      {/* Post Likes Modal */}
      {showLikersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                  <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Post Likes</h2>
              </div>
              <button 
                onClick={() => setShowLikersModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {loadingLikers ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : likersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 gap-2">
                  <Heart className="w-10 h-10 text-gray-300" />
                  <p className="text-sm font-medium">No likes recorded yet.</p>
                </div>
              ) : (
                likersList.map((liker: any, index: number) => (
                  <Link
                    key={liker.id || index}
                    href={`/profile/${liker.user_id}`}
                    onClick={() => setShowLikersModal(false)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {liker.avatar ? (
                        <img 
                          src={liker.avatar} 
                          alt={liker.name} 
                          className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-100"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-red-500 text-white font-bold flex items-center justify-center shrink-0">
                          {liker.name[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate group-hover:text-red-500 transition-colors">
                          {liker.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          Liked {new Date(liker.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
