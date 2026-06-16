import { supabase } from '@/lib/supabase';

// Types
export interface Post {
  id: string;
  created_at: string;
  user_id: string;
  frequency_id: string | null;
  text: string;
  image: string | null;
  author: {
    name: string;
    avatar: string;
  };
  likes: number;
  liked: boolean;
  comments: number;
}

export interface Comment {
  id: string;
  created_at: string;
  user_id: string;
  text: string;
  author: {
    name: string;
    avatar: string;
  };
}

/**
 * Fetch posts (either global or for a specific frequency)
 */
export async function fetchPosts(frequencyId?: string): Promise<Post[]> {
  let query = supabase
    .from('posts')
    .select(`
      id,
      created_at,
      user_id,
      frequency_id,
      text,
      image,
      profiles:user_id ( first_name, last_name, avatar_url ),
      post_likes ( user_id ),
      post_comments ( id )
    `)
    .order('created_at', { ascending: false });

  if (frequencyId) {
    query = query.eq('frequency_id', frequencyId);
  } else {
    query = query.is('frequency_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id;

  return data.map((post: any) => {
    // Format name properly based on profiles
    const firstName = post.profiles?.first_name || '';
    const lastName = post.profiles?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'User';

    return {
      id: post.id,
      created_at: new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      user_id: post.user_id,
      frequency_id: post.frequency_id,
      text: post.text,
      image: post.image,
      author: {
        name: fullName,
        avatar: post.profiles?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'
      },
      likes: post.post_likes?.length || 0,
      liked: currentUserId ? post.post_likes?.some((like: any) => like.user_id === currentUserId) : false,
      comments: post.post_comments?.length || 0,
    };
  });
}

/**
 * Fetch a single post by ID
 */
export async function fetchPostById(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      created_at,
      user_id,
      frequency_id,
      text,
      image,
      profiles:user_id ( first_name, last_name, avatar_url ),
      post_likes ( user_id ),
      post_comments ( id )
    `)
    .eq('id', postId)
    .single();

  if (error || !data) {
    console.error('Error fetching post:', error);
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id;

  const firstName = data.profiles?.first_name || '';
  const lastName = data.profiles?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'User';

  return {
    id: data.id,
    created_at: new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    user_id: data.user_id,
    frequency_id: data.frequency_id,
    text: data.text,
    image: data.image,
    author: {
      name: fullName,
      avatar: data.profiles?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'
    },
    likes: data.post_likes?.length || 0,
    liked: currentUserId ? data.post_likes?.some((like: any) => like.user_id === currentUserId) : false,
    comments: data.post_comments?.length || 0,
  };
}

/**
 * Fetch comments for a post
 */
export async function fetchPostComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      id,
      created_at,
      user_id,
      text,
      profiles:user_id ( first_name, last_name, avatar_url )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data.map((comment: any) => {
    const firstName = comment.profiles?.first_name || '';
    const lastName = comment.profiles?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'User';

    return {
      id: comment.id,
      created_at: new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      user_id: comment.user_id,
      text: comment.text,
      author: {
        name: fullName,
        avatar: comment.profiles?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'
      }
    };
  });
}

/**
 * Create a new post
 */
export async function createPost(text: string, frequencyId?: string, imageFile?: File): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error("NOT_LOGGED_IN");
  }

  let imageUrl = null;

  // Upload image if provided
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userData.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);
      
    imageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from('posts')
    .insert({
      user_id: userData.user.id,
      text: text,
      frequency_id: frequencyId || null,
      image: imageUrl
    });

  if (error) {
    console.error('Error creating post:', error);
    return false;
  }

  return true;
}

/**
 * Update an existing post
 */
export async function updatePost(postId: string, text: string, frequencyId?: string, imageFile?: File, existingImageUrl?: string | null): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error("NOT_LOGGED_IN");
  }

  let imageUrl = existingImageUrl;

  // Upload image if provided
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userData.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);
      
    imageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from('posts')
    .update({
      text: text,
      frequency_id: frequencyId || null,
      image: imageUrl
    })
    .eq('id', postId);

  if (error) {
    console.error('Error updating post:', error);
    return false;
  }

  return true;
}

/**
 * Toggle like on a post
 */
export async function toggleLike(postId: string, currentLikedState: boolean): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  if (currentLikedState) {
    // Unlike
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .match({ post_id: postId, user_id: userData.user.id });
      
    if (error) {
      console.error('Error removing like:', error);
      return false;
    }
  } else {
    // Like
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userData.user.id
      });
      
    if (error) {
      console.error('Error adding like:', error);
      return false;
    }
  }

  return true;
}

/**
 * Add a comment to a post
 */
export async function createComment(postId: string, text: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  const { error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userData.user.id,
      text: text
    });

  if (error) {
    console.error('Error adding comment:', error);
    return false;
  }

  return true;
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<boolean> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }

  return true;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    return false;
  }

  return true;
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, text: string): Promise<boolean> {
  const { error } = await supabase
    .from('post_comments')
    .update({ text: text })
    .eq('id', commentId);

  if (error) {
    console.error('Error updating comment:', error);
    return false;
  }

  return true;
}
