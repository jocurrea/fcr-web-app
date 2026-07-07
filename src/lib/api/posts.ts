import { supabase } from '@/lib/supabase';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/shapes/svg?seed=user';

const USER_IDENTITY_SELECT = `
  id,
  accountType,
  firstName,
  middleName,
  lastName,
  profileImage,
  associateCompany:companies!companies_owner_user_id_fkey (
    id,
    name,
    logo_url,
    status
  )
`;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getUserName(user: any) {
  const company = Array.isArray(user?.associateCompany) ? user.associateCompany[0] : user?.associateCompany;
  if (user?.accountType === 'business' && company?.name) return company.name;

  return [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ').trim() || 'User';
}

function getUserAvatar(user: any) {
  const company = Array.isArray(user?.associateCompany) ? user.associateCompany[0] : user?.associateCompany;
  if (user?.accountType === 'business' && company?.logo_url) return company.logo_url;

  return user?.profileImage || DEFAULT_AVATAR;
}

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
      userId,
      groupId,
      body,
      file,
      user:users ( ${USER_IDENTITY_SELECT} ),
      postLikes ( id, userId ),
      comments ( id )
    `)
    .order('created_at', { ascending: false });

  if (frequencyId) {
    query = query.eq('groupId', frequencyId);
  } else {
    query = query.is('groupId', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id;

  return data.map((post: any) => {
    return {
      id: post.id,
      created_at: formatDate(post.created_at),
      user_id: post.userId,
      frequency_id: post.groupId,
      text: post.body || '',
      image: post.file || null,
      author: {
        name: getUserName(post.user),
        avatar: getUserAvatar(post.user),
      },
      likes: post.postLikes?.length || 0,
      liked: currentUserId ? post.postLikes?.some((like: any) => like.userId === currentUserId) : false,
      comments: post.comments?.length || 0,
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
      userId,
      groupId,
      body,
      file,
      user:users ( ${USER_IDENTITY_SELECT} ),
      postLikes ( id, userId ),
      comments ( id )
    `)
    .eq('id', postId)
    .single();

  if (error || !data) {
    console.error('Error fetching post:', error);
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id;

  return {
    id: data.id,
    created_at: formatDate(data.created_at),
    user_id: data.userId,
    frequency_id: data.groupId,
    text: data.body || '',
    image: data.file || null,
    author: {
      name: getUserName((data as any).user),
      avatar: getUserAvatar((data as any).user),
    },
    likes: (data as any).postLikes?.length || 0,
    liked: currentUserId ? (data as any).postLikes?.some((like: any) => like.userId === currentUserId) : false,
    comments: (data as any).comments?.length || 0,
  };
}

/**
 * Fetch comments for a post
 */
export async function fetchPostComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      created_at,
      userId,
      body,
      user:users ( ${USER_IDENTITY_SELECT} )
    `)
    .eq('postId', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data.map((comment: any) => {
    return {
      id: comment.id,
      created_at: formatDate(comment.created_at),
      user_id: comment.userId,
      text: comment.body || '',
      author: {
        name: getUserName(comment.user),
        avatar: getUserAvatar(comment.user),
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
      userId: userData.user.id,
      body: text,
      groupId: frequencyId || null,
      file: imageUrl
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
      body: text,
      groupId: frequencyId || null,
      file: imageUrl
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
      .from('postLikes')
      .delete()
      .match({ postId: postId, userId: userData.user.id });
      
    if (error) {
      console.error('Error removing like:', error);
      return false;
    }
  } else {
    // Like
    const { error } = await supabase
      .from('postLikes')
      .insert({
        postId: postId,
        userId: userData.user.id
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
    .from('comments')
    .insert({
      postId: postId,
      userId: userData.user.id,
      body: text
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
    .from('comments')
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
    .from('comments')
    .update({ body: text })
    .eq('id', commentId);

  if (error) {
    console.error('Error updating comment:', error);
    return false;
  }

  return true;
}
