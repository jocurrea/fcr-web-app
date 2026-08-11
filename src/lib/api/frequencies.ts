import { supabase } from '@/lib/supabase';

export interface Frequency {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isPublic: boolean;
  userId: string;
  created_at: string;
  isBusiness?: boolean;
}

/**
 * Enrich frequency objects with isBusiness status if creator is a corporate account or business user
 */
async function enrichFrequenciesWithBusinessStatus(freqs: Frequency[]): Promise<Frequency[]> {
  if (!freqs || freqs.length === 0) return [];

  const creatorUserIds = Array.from(new Set(freqs.map(f => f.userId).filter(Boolean)));
  if (creatorUserIds.length === 0) return freqs;

  const [{ data: companiesData }, { data: usersData }] = await Promise.all([
    supabase.from('companies').select('owner_user_id').in('owner_user_id', creatorUserIds),
    supabase.from('users').select('id, accountType').in('id', creatorUserIds)
  ]);

  const businessOwners = new Set((companiesData || []).map(c => c.owner_user_id));
  const userAccountTypeMap = new Map((usersData || []).map(u => [u.id, u.accountType]));

  return freqs.map(f => {
    const isBiz = businessOwners.has(f.userId) || userAccountTypeMap.get(f.userId) === 'business';
    return {
      ...f,
      isBusiness: isBiz
    };
  });
}

/**
 * Fetch groups the current user is a member of
 */
export async function fetchJoinedFrequencies(): Promise<Frequency[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  // Query groupMembers and join with groups
  const { data, error } = await supabase
    .from('groupMembers')
    .select(`
      groupId,
      groups (
        id,
        name,
        description,
        image,
        isPublic,
        userId,
        created_at
      )
    `)
    .eq('userId', userData.user.id);

  if (error || !data) {
    console.error('Error fetching joined groups:', error);
    return [];
  }

  // Extract inner frequency objects and deduplicate by ID
  const uniqueMap = new Map<string, Frequency>();
  data.forEach((item: any) => {
    if (item.groups?.id) {
      const g = item.groups;
      const freqObj: Frequency = {
        ...g,
        userId: g.userId || g.user_id || ''
      };
      uniqueMap.set(String(g.id), freqObj);
    }
  });

  const joinedList = Array.from(uniqueMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  return enrichFrequenciesWithBusinessStatus(joinedList);
}

/**
 * Fetch public groups the current user has NOT joined yet
 */
export async function fetchAvailableFrequencies(): Promise<Frequency[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const userId = userData.user.id;

  // Fetch all public groups
  const { data: allFrequencies, error: freqError } = await supabase
    .from('groups')
    .select('*')
    .eq('isPublic', true)
    .order('name');

  if (freqError || !allFrequencies) {
    console.error('Error fetching all groups:', freqError);
    return [];
  }

  // Fetch user's joined frequency IDs
  const { data: joined, error: joinedError } = await supabase
    .from('groupMembers')
    .select('groupId')
    .eq('userId', userId);

  if (joinedError) {
    console.error('Error fetching joined frequency IDs:', joinedError);
    return [];
  }

  const joinedIds = new Set(joined?.map(j => j.groupId) || []);

  const availableList = allFrequencies.filter(f => !joinedIds.has(f.id)).map(f => ({
    ...f,
    userId: f.userId || f.user_id || ''
  }));

  return enrichFrequenciesWithBusinessStatus(availableList);
}

/**
 * Create a new frequency
 */
export async function createFrequency(
  name: string,
  description: string | null,
  iconFile: File | undefined,
  isPublic: boolean,
  selectedUsers: string[] = []
): Promise<{ success: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  let iconUrl: string | null = null;

  // Upload icon if provided
  if (iconFile) {
    const fileExt = iconFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `groups/${userData.user.id}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, iconFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return { success: false, error: `Error uploading image: ${uploadError.message}. Make sure the 'uploads' bucket exists.` };
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);
      
    iconUrl = publicUrlData.publicUrl;
  }

  // Insert frequency
  const { data: newFreq, error: createError } = await supabase
    .from('groups')
    .insert({
      name: name,
      description: description,
      image: iconUrl,
      isPublic: isPublic ? 1 : 0,
      userId: userData.user.id
    })
    .select('id')
    .single();

  if (createError || !newFreq) {
    console.error('Error creating frequency:', createError);
    return { success: false, error: `Error creating frequency: ${createError?.message}` };
  }

  // Only add creator to groupMembers (invited members receive invitation notifications and join when they accept)
  const { error: memberError } = await supabase
    .from('groupMembers')
    .insert({ groupId: newFreq.id, userId: userData.user.id });

  if (memberError) {
    console.error('Error adding creator as member:', memberError);
    return { success: false, error: `Frequency created but failed to set creator member: ${memberError.message}` };
  }

  if (selectedUsers.length > 0) {
    try {
      const notifsToInsert = selectedUsers.map(invitedUserId => ({
        senderId: userData.user.id,
        receiverId: invitedUserId,
        title: 'Frequency Invitation',
        data: JSON.stringify({ message: `Invited you to ${name}`, frequencyId: newFreq.id }),
        type: 'frequency_invite',
        read: 0
      }));

      await supabase.from('notifications').insert(notifsToInsert);
    } catch (err) {
      console.error('Failed to create invitation notifications:', err);
    }
  }

  return { success: true };
}

/**
 * Update an existing frequency
 */
export async function updateFrequency(
  frequencyId: string,
  name: string,
  description: string | null,
  iconFile: File | undefined
): Promise<{ success: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  let iconUrl: string | undefined = undefined;

  // Upload new icon if provided
  if (iconFile) {
    const fileExt = iconFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `groups/${userData.user.id}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, iconFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return { success: false, error: `Error uploading image: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);
      
    iconUrl = publicUrlData.publicUrl;
  }

  const updateData: any = {
    name: name,
    description: description
  };

  if (iconUrl) {
    updateData.image = iconUrl;
  }

  const { error: updateError } = await supabase
    .from('groups')
    .update(updateData)
    .eq('id', frequencyId)
    .eq('userId', userData.user.id); // Ensure only owner can update

  if (updateError) {
    console.error('Error updating frequency:', updateError);
    return { success: false, error: `Error updating frequency: ${updateError.message}` };
  }

  return { success: true };
}

/**
 * Join a frequency
 */
export async function joinFrequency(frequencyId: string | number): Promise<{ success: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: "User not authenticated" };

  const numericId = Number(frequencyId);
  const targetGroupId = !isNaN(numericId) && String(numericId) === String(frequencyId).trim() ? numericId : frequencyId;

  // 1. Check if user is ALREADY a member
  const { data: existingMember } = await supabase
    .from('groupMembers')
    .select('*')
    .eq('groupId', targetGroupId)
    .eq('userId', userData.user.id)
    .maybeSingle();

  if (existingMember) {
    return { success: true };
  }

  // 2. Try inserting with groupId
  const { error } = await supabase
    .from('groupMembers')
    .insert({
      groupId: targetGroupId,
      userId: userData.user.id
    });

  if (error) {
    if (error.code === '23505') return { success: true }; 

    // Try fallback with snake_case fields or string ID
    const { error: fallbackError } = await supabase
      .from('groupMembers')
      .insert({
        group_id: targetGroupId,
        user_id: userData.user.id
      } as any);

    if (!fallbackError || fallbackError.code === '23505') return { success: true };

    // Check if member already exists via snake_case columns
    const { data: existingFallback } = await supabase
      .from('groupMembers')
      .select('*')
      .eq('group_id', targetGroupId)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (existingFallback) return { success: true };

    console.error('Error joining frequency:', error, fallbackError);
    return { 
      success: false, 
      error: error.message || fallbackError.message || error.details || "Database constraint failed" 
    };
  }

  return { success: true };
}

/**
 * Fetch a single frequency by ID
 */
export async function fetchFrequencyById(frequencyId: string): Promise<Frequency | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', frequencyId)
    .single();

  if (error || !data) {
    return null;
  }

  const raw = data as any;
  const freqObj: Frequency = {
    ...raw,
    userId: raw.userId || raw.user_id || raw.created_by || ''
  };

  const enriched = await enrichFrequenciesWithBusinessStatus([freqObj]);
  return enriched[0] || freqObj;
}

/**
 * Leave a frequency
 */
export async function leaveFrequency(frequencyId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  const { error } = await supabase
    .from('groupMembers')
    .delete()
    .match({
      groupId: frequencyId,
      userId: userData.user.id
    });

  if (error) {
    console.error('Error leaving frequency:', error);
    return false;
  }

  return true;
}

export interface FrequencyMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

/**
 * Fetch real members of a frequency from groupMembers, users, and resumes
 */
export async function fetchFrequencyMembers(frequencyId: string): Promise<FrequencyMember[]> {
  try {
    // 1. Fetch group members for this frequency
    let { data: membersData, error } = await supabase
      .from('groupMembers')
      .select('*')
      .or(`groupId.eq.${frequencyId},group_id.eq.${frequencyId}`);

    if (error || !membersData || membersData.length === 0) {
      // Fallback: check if group creator exists
      const { data: group } = await supabase
        .from('groups')
        .select('userId')
        .eq('id', frequencyId)
        .maybeSingle();

      if (group?.userId) {
        membersData = [{ userId: group.userId }];
      } else {
        return [];
      }
    }

    const userIds = Array.from(
      new Set(membersData.map((m: any) => m.userId || m.user_id).filter(Boolean))
    ) as string[];

    if (userIds.length === 0) return [];

    // 2. Fetch user profile data, resumes, & companies in parallel
    const [{ data: usersData }, { data: resumesData }, { data: companiesData }] = await Promise.all([
      supabase.from('users').select('id, firstName, lastName, username, profileImage, position, accountType, companyName').in('id', userIds),
      supabase.from('resumes').select('userId, data').in('userId', userIds),
      supabase.from('companies').select('owner_user_id, name, logo_url, company_type').in('owner_user_id', userIds)
    ]);

    const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
    const resumesMap = new Map(resumesData?.map(r => [r.userId, r.data]) || []);
    const companiesMap = new Map(companiesData?.map(c => [c.owner_user_id, c]) || []);

    const { data: currentAuth } = await supabase.auth.getUser();
    const currentUserId = currentAuth?.user?.id;

    return userIds.map(uid => {
      const u = usersMap.get(uid) as any;
      const r = resumesMap.get(uid) as any;
      const c = companiesMap.get(uid) as any;

      // Check if logged-in user has local storage photo/name fallback
      let localPhoto: string | null = null;
      let localFirstName: string | null = null;
      let localLastName: string | null = null;
      let localCompanyName: string | null = null;
      if (typeof window !== 'undefined' && uid === currentUserId) {
        localPhoto = localStorage.getItem("userProfilePhoto");
        try {
          const localPers = localStorage.getItem("onboarding_personal");
          if (localPers) {
            const parsed = JSON.parse(localPers);
            localFirstName = parsed?.firstName || null;
            localLastName = parsed?.lastName || null;
          }
          const localBus = localStorage.getItem("business_profile");
          if (localBus) {
            const parsed = JSON.parse(localBus);
            localCompanyName = parsed?.companyName || null;
          }
        } catch {}
      }

      const firstName = u?.firstName || r?.personal?.firstName || localFirstName || '';
      const lastName = u?.lastName || r?.personal?.lastName || localLastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const isBusinessAccount = u?.accountType === 'business' || !!c || !!localCompanyName;
      
      const name = c?.name || u?.companyName || localCompanyName || (isBusinessAccount && u?.username && u.username !== 'user' ? u.username : null) || fullName || u?.username || (isBusinessAccount ? 'Corporate Account' : 'Member');
      
      const role = c?.company_type || (isBusinessAccount ? 'Corporate associate account' : (u?.position || r?.personal?.position || r?.work?.position || 'Pilot'));

      const avatar = localPhoto || c?.logo_url || u?.profileImage || r?.personal?.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || uid)}`;

      return {
        id: uid,
        name,
        role,
        avatar
      };
    });
  } catch (err) {
    console.error('Error fetching frequency members:', err);
    return [];
  }
}

