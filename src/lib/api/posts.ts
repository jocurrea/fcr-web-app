import { supabase } from '@/lib/supabase';

const USER_IDENTITY_SELECT = `
  id,
  firstName,
  middleName,
  lastName,
  username,
  profileImage
`;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Types
export interface Post {
  id: string;
  user_id: string;
  frequency_id: string | null;
  text: string;
  image: string | null;
  created_at: string;
  author: {
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  liked: boolean;
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
  try {
    let query = supabase
      .from('posts')
      .select(`
        id,
        created_at,
        userId,
        groupId,
        body,
        file,
        user:users ( id, firstName, middleName, lastName, username, profileImage ),
        postLikes ( id, userId ),
        comments ( id )
      `)
      .order('created_at', { ascending: false });

    if (frequencyId) {
      query = query.eq('groupId', frequencyId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[fetchPosts] join error, retrying without join:', error.message);
      // Fallback: fetch posts without join
      let fallback = supabase
        .from('posts')
        .select('id, created_at, userId, groupId, body, file')
        .order('created_at', { ascending: false });
      if (frequencyId) fallback = fallback.eq('groupId', frequencyId);
      const { data: fallbackData, error: fallbackError } = await fallback;
      if (fallbackError || !fallbackData) return [];
      return buildPostsWithResumes(fallbackData, undefined);
    }

    if (!data || data.length === 0) return [];

    return buildPostsWithResumes(data, 'withUser');
  } catch (err) {
    console.error('[fetchPosts] Exception:', err);
    return [];
  }
}

async function buildPostsWithResumes(data: any[], mode?: string): Promise<Post[]> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  const currentUserEmail = authData?.user?.email || '';
  const currentUserMeta = authData?.user?.user_metadata || {};

  const postIds = data.map((p: any) => p.id);
  const authorIds = Array.from(new Set(data.map((p: any) => p.userId).filter(Boolean))) as string[];

  // Fetch resumes, users, companies, likes, comments in parallel
  const [resumesRes, usersRes, companiesRes, postLikesRes, commentsRes] = await Promise.allSettled([
    authorIds.length > 0
      ? supabase.from('resumes').select('userId, data').in('userId', authorIds)
      : Promise.resolve({ data: [] }),
    authorIds.length > 0
      ? supabase.from('users').select('id, firstName, middleName, lastName, username, profileImage').in('id', authorIds)
      : Promise.resolve({ data: [] }),
    authorIds.length > 0
      ? supabase.from('companies').select('owner_user_id, name, logo_url').in('owner_user_id', authorIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0 && mode !== 'withUser'
      ? supabase.from('postLikes').select('postId, userId').in('postId', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0 && mode !== 'withUser'
      ? supabase.from('comments').select('postId').in('postId', postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const resumesMap: Record<string, { name: string; avatar: string }> = {};
  if (resumesRes.status === 'fulfilled' && resumesRes.value?.data) {
    for (const r of resumesRes.value.data as any[]) {
      const p = r.data?.personal;
      if (!p) continue;
      const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim();
      const avatar = p.profilePhoto || p.profileImage || '';
      if (name || avatar) resumesMap[r.userId] = { name, avatar };
    }
  }

  const usersMap: Record<string, any> = {};
  if (usersRes.status === 'fulfilled' && usersRes.value?.data) {
    for (const u of usersRes.value.data as any[]) {
      usersMap[u.id] = u;
    }
  }

  const companiesMap: Record<string, { name: string; avatar: string }> = {};
  if (companiesRes.status === 'fulfilled' && companiesRes.value?.data) {
    for (const c of companiesRes.value.data as any[]) {
      companiesMap[c.owner_user_id] = { name: c.name || '', avatar: c.logo_url || '' };
    }
  }

  const likesMap: Record<string, { count: number; userLiked: boolean }> = {};
  const commentsMap: Record<string, number> = {};

  if (postLikesRes.status === 'fulfilled' && (postLikesRes.value as any)?.data) {
    for (const like of (postLikesRes.value as any).data) {
      if (!likesMap[like.postId]) likesMap[like.postId] = { count: 0, userLiked: false };
      likesMap[like.postId].count++;
      if (currentUserId && like.userId === currentUserId) likesMap[like.postId].userLiked = true;
    }
  }

  if (commentsRes.status === 'fulfilled' && (commentsRes.value as any)?.data) {
    for (const c of (commentsRes.value as any).data) {
      commentsMap[c.postId] = (commentsMap[c.postId] || 0) + 1;
    }
  }

  return data.map((post: any) => {
    // u from nested join (mode=withUser), or from direct users query
    const uFromJoin = post.user;
    const uFromDirect = usersMap[post.userId];
    const u = uFromJoin || uFromDirect;
    const resume = resumesMap[post.userId];
    const company = companiesMap[post.userId];

    // Name priority:
    // 1. Company Name (if business account)
    // 2. Resume (most reliable — filled during onboarding)
    // 3. users table firstName+lastName (from nested join or direct query)
    // 4. localStorage (if it's the current user's post)
    // 5. Auth user_metadata name (if it's the current user)
    // 6. Username from users table (anything is better than "User")
    // 7. Email prefix (last resort for current user)
    const dbFirstLast = [u?.firstName, u?.middleName, u?.lastName].filter(Boolean).join(' ').trim();
    let authorName = company?.name || resume?.name || dbFirstLast;

    if (!authorName && post.userId === currentUserId) {
      // Try localStorage onboarding data
      try {
        const saved = localStorage.getItem('onboarding_personal');
        if (saved) {
          const parsed = JSON.parse(saved);
          const localName = [parsed.firstName, parsed.middleName, parsed.lastName].filter(Boolean).join(' ').trim();
          if (localName) authorName = localName;
        }
      } catch {}

      // Try Supabase auth user_metadata
      if (!authorName) {
        const metaName = [currentUserMeta.firstName, currentUserMeta.lastName].filter(Boolean).join(' ').trim()
          || currentUserMeta.full_name
          || currentUserMeta.name
          || '';
        if (metaName) authorName = metaName;
      }

      // Try email prefix as last resort for current user
      if (!authorName && currentUserEmail) {
        const prefix = currentUserEmail.split('@')[0];
        if (prefix) authorName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }

    // For any user: show username if we still have no name (better than "User")
    if (!authorName && u?.username) {
      // Show any non-empty username
      authorName = u.username;
    }

    // Avatar priority:
    // 1. Company Logo
    // 2. Resume profilePhoto
    // 3. users table profileImage (nested join or direct)
    // 4. localStorage photo (current user only)
    // 5. Dicebear shape
    let authorAvatar = company?.avatar || resume?.avatar || u?.profileImage;

    if (!authorAvatar && post.userId === currentUserId) {
      try {
        const savedPhoto = localStorage.getItem('userProfilePhoto');
        if (savedPhoto) authorAvatar = savedPhoto;
      } catch {}
    }

    if (!authorAvatar) {
      authorAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(post.userId || 'user')}`;
    }

    const likes = post.postLikes ? post.postLikes.length : (likesMap[post.id]?.count || 0);
    const comments = post.comments ? post.comments.length : (commentsMap[post.id] || 0);
    const liked = post.postLikes
      ? (currentUserId ? post.postLikes.some((l: any) => l.userId === currentUserId) : false)
      : (likesMap[post.id]?.userLiked || false);

    return {
      id: post.id,
      created_at: formatDate(post.created_at),
      user_id: post.userId,
      frequency_id: post.groupId,
      text: post.body || '',
      image: post.file || null,
      author: {
        name: authorName || 'User',
        avatar: authorAvatar,
      },
      likes,
      comments,
      liked,
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

  let companyName = null;
  let companyLogo = null;
  let resumeName = null;
  let resumeAvatar = null;

  if (data.userId) {
    const [companiesRes, resumeRes] = await Promise.all([
      supabase.from('companies').select('name, logo_url').eq('owner_user_id', data.userId).limit(1),
      supabase.from('resumes').select('data').eq('userId', data.userId).limit(1)
    ]);

    if (companiesRes.data && companiesRes.data.length > 0) {
      companyName = companiesRes.data[0].name;
      companyLogo = companiesRes.data[0].logo_url;
    }

    if (resumeRes.data && resumeRes.data.length > 0) {
      const personal = resumeRes.data[0].data?.personal;
      if (personal) {
        resumeName = [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').trim();
        resumeAvatar = personal.profilePhoto || personal.profileImage || null;
      }
    }
  }

  const dbFirstLast = [(data as any).user?.firstName, (data as any).user?.middleName, (data as any).user?.lastName].filter(Boolean).join(' ').trim();
  let authorName = companyName || resumeName || dbFirstLast;

  if (!authorName && data.userId === currentUserId) {
    try {
      const savedPersonal = localStorage.getItem('onboarding_personal');
      if (savedPersonal) {
        const parsed = JSON.parse(savedPersonal);
        const localName = [parsed.firstName, parsed.middleName, parsed.lastName].filter(Boolean).join(' ').trim();
        if (localName) authorName = localName;
      }
    } catch {}
  }

  if (!authorName) {
    const u = (data as any).user;
    if (u?.username && u.username !== 'user' && !u.username.startsWith('user_')) authorName = u.username;
    else if (u?.email) {
      const prefix = u.email.split('@')[0];
      if (prefix) authorName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
  }

  let authorAvatar = companyLogo || resumeAvatar || (data as any).user?.profileImage;
  if (!authorAvatar && data.userId === currentUserId) {
    try {
      const savedPhoto = localStorage.getItem('userProfilePhoto');
      if (savedPhoto) authorAvatar = savedPhoto;
    } catch {}
  }

  if (!authorAvatar) {
    authorAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(data.userId || 'user')}`;
  }

  return {
    id: data.id,
    created_at: formatDate(data.created_at),
    user_id: data.userId,
    frequency_id: data.groupId,
    text: data.body || '',
    image: data.file || null,
    author: {
      name: authorName || 'User',
      avatar: authorAvatar,
    },
    likes: (data as any).postLikes?.length || 0,
    comments: (data as any).comments?.length || 0,
    liked: currentUserId ? (data as any).postLikes?.some((like: any) => like.userId === currentUserId) : false,
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

  const commentUserIds = Array.from(new Set(data.map((c: any) => c.userId).filter(Boolean)));
  let companiesMap: Record<string, { name: string, logo_url: string }> = {};
  let resumesMap: Record<string, { name: string, avatar: string }> = {};

  if (commentUserIds.length > 0) {
    const [companiesRes, resumesRes] = await Promise.all([
      supabase.from('companies').select('owner_user_id, name, logo_url').in('owner_user_id', commentUserIds),
      supabase.from('resumes').select('userId, data').in('userId', commentUserIds)
    ]);

    if (companiesRes.data) {
      companiesRes.data.forEach(company => {
        companiesMap[company.owner_user_id] = {
          name: company.name || '',
          logo_url: company.logo_url || ''
        };
      });
    }

    if (resumesRes.data) {
      resumesRes.data.forEach((r: any) => {
        const personal = r.data?.personal;
        if (personal) {
          const name = [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ').trim();
          const avatar = personal.profilePhoto || personal.profileImage || '';
          if (name || avatar) {
            resumesMap[r.userId] = { name, avatar };
          }
        }
      });
    }
  }

  return data.map((comment: any) => {
    const company = companiesMap[comment.userId];
    const resumeInfo = resumesMap[comment.userId];
    const dbFirstLast = [comment.user?.firstName, comment.user?.middleName, comment.user?.lastName].filter(Boolean).join(' ').trim();

    let authorName = company?.name || resumeInfo?.name || dbFirstLast;
    if (!authorName) {
      if (comment.user?.username && comment.user.username !== 'user' && !comment.user.username.startsWith('user_')) {
        authorName = comment.user.username;
      } else if (comment.user?.email) {
        const prefix = comment.user.email.split('@')[0];
        if (prefix) authorName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }

    let authorAvatar = company?.logo_url || resumeInfo?.avatar || comment.user?.profileImage;
    if (!authorAvatar) {
      authorAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(comment.userId || 'user')}`;
    }

    return {
      id: comment.id,
      created_at: formatDate(comment.created_at),
      user_id: comment.userId,
      text: comment.body || '',
      author: {
        name: authorName || 'User',
        avatar: authorAvatar,
      }
    };
  });
}

/**
 * Create a new post
 */
export async function createPost(text: string, frequencyId?: string, imageFile?: File): Promise<{success: boolean, error?: string}> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error("NOT_LOGGED_IN");
  }

  let imageUrl = null;

  // Upload image if provided
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `posts/${userData.user.id}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return { success: false, error: 'Failed to upload image: ' + uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);
      
    imageUrl = publicUrlData.publicUrl;
  }

  // Sync author's profile to Supabase database so other users can see name and avatar
  try {
    const savedPhoto = typeof window !== 'undefined' ? localStorage.getItem("userProfilePhoto") : null;
    const savedPersonal = typeof window !== 'undefined' ? localStorage.getItem("onboarding_personal") : null;
    const personal = savedPersonal ? JSON.parse(savedPersonal) : null;

    if (personal?.firstName || savedPhoto) {
      const { data: existingResume } = await supabase
        .from('resumes')
        .select('data')
        .eq('userId', userData.user.id)
        .maybeSingle();

      const currentData = (existingResume?.data as any) || {};
      const mergedData = {
        ...currentData,
        personal: {
          ...(currentData.personal || {}),
          ...(personal || {}),
          firstName: personal?.firstName || currentData.personal?.firstName,
          middleName: personal?.middleName || currentData.personal?.middleName,
          lastName: personal?.lastName || currentData.personal?.lastName,
          profilePhoto: savedPhoto || currentData.personal?.profilePhoto
        }
      };

      await Promise.allSettled([
        supabase.from('users').upsert({
          id: userData.user.id,
          firstName: personal?.firstName,
          middleName: personal?.middleName,
          lastName: personal?.lastName,
          profileImage: savedPhoto || undefined,
          onboarded: 1
        }, { onConflict: 'id' }),
        supabase.from('resumes').upsert({
          userId: userData.user.id,
          data: mergedData
        }, { onConflict: 'userId' })
      ]);
    }
  } catch (e) {
    console.error('Error syncing profile in createPost:', e);
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
    return { success: false, error: 'Database error: ' + error.message };
  }

  return { success: true };
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
    const filePath = `posts/${userData.user.id}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
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

    // Add notification
    try {
      const { data: postData } = await supabase.from('posts').select('userId').eq('id', postId).single();
      if (postData && postData.userId !== userData.user.id) {
        const { data: senderData } = await supabase.from('users').select('firstName, lastName, username').eq('id', userData.user.id).single();
        const senderName = senderData ? ([senderData.firstName, senderData.lastName].filter(Boolean).join(' ').trim() || senderData.username || 'Someone') : 'Someone';
        
        await supabase.from('notifications').insert({
          senderId: userData.user.id,
          receiverId: postData.userId,
          title: 'New Like',
          data: `${senderName} liked your post.`,
          type: 'like',
          read: 0
        });
      }
    } catch (err) {
      console.error('Error creating notification:', err);
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

  // Add notification
  try {
    const { data: postData } = await supabase.from('posts').select('userId').eq('id', postId).single();
    if (postData && postData.userId !== userData.user.id) {
      const { data: senderData } = await supabase.from('users').select('firstName, lastName, username').eq('id', userData.user.id).single();
      const senderName = senderData ? ([senderData.firstName, senderData.lastName].filter(Boolean).join(' ').trim() || senderData.username || 'Someone') : 'Someone';
      
      await supabase.from('notifications').insert({
        senderId: userData.user.id,
        receiverId: postData.userId,
        title: 'New Comment',
        data: `${senderName} commented on your post: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`,
        type: 'comment',
        read: 0
      });
    }
  } catch (err) {
    console.error('Error creating notification:', err);
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

/**
 * Fetch list of users who liked a specific post
 */
export async function fetchPostLikers(postId: string) {
  try {
    const { data: likesData, error } = await supabase
      .from('postLikes')
      .select('id, created_at, userId')
      .eq('postId', postId)
      .order('created_at', { ascending: false });

    if (error || !likesData || likesData.length === 0) return [];

    const userIds = Array.from(new Set(likesData.map((l: any) => l.userId).filter(Boolean))) as string[];
    if (userIds.length === 0) return [];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, firstName, middleName, lastName, username, profileImage')
      .in('id', userIds);

    const userMap = new Map(usersData?.map((u: any) => [u.id, u]) || []);

    return likesData.map((like: any) => {
      const userObj = userMap.get(like.userId);
      const name = userObj
        ? ([userObj.firstName, userObj.lastName].filter(Boolean).join(' ').trim() || userObj.username || 'User')
        : 'User';
      return {
        id: like.id,
        created_at: like.created_at,
        user_id: like.userId,
        name,
        avatar: userObj?.profileImage || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'
      };
    });
  } catch (err) {
    console.error('Error in fetchPostLikers:', err);
    return [];
  }
}
