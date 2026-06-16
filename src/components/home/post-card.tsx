import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Heart, MessageCircle } from "lucide-react";

interface PostCardProps {
  id?: string;
  user: {
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
  const [isLiked, setIsLiked] = useState(liked || false);
  const [likeCount, setLikeCount] = useState(likes || 0);

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900 leading-none">{user.name}</h3>
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
      <div className="p-4 flex items-center gap-5">
        <button 
          onClick={toggleLike}
          className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors group"
        >
          <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : "group-hover:fill-red-500"}`} />
          {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
        </button>
        <button 
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {(comments || 0) > 0 && <span className="text-sm font-medium">{comments}</span>}
        </button>
      </div>
    </div>
  );
}
