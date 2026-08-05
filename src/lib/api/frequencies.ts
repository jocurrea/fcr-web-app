import { supabase } from '@/lib/supabase';

export interface Frequency {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isPublic: boolean;
  userId: string;
  created_at: string;
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

  // Extract the inner frequency objects
  return data
    .map((item: any) => item.groups as Frequency)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch public groups the current user has NOT joined yet
 */
export async function fetchAvailableFrequencies(): Promise<Frequency[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const userId = userData.user.id;

  // Since Supabase RPC or complex NOT IN joins can be tricky over the JS client,
  // we can fetch all public groups and all joined frequency IDs, then filter locally.
  // This is fine for small/medium scale.
  
  // 1. Fetch all public groups
  const { data: allFrequencies, error: freqError } = await supabase
    .from('groups')
    .select('*')
    .eq('isPublic', true)
    .order('name');

  if (freqError || !allFrequencies) {
    console.error('Error fetching all groups:', freqError);
    return [];
  }

  // 2. Fetch user's joined frequency IDs
  const { data: joined, error: joinedError } = await supabase
    .from('groupMembers')
    .select('groupId')
    .eq('userId', userId);

  if (joinedError) {
    console.error('Error fetching joined frequency IDs:', joinedError);
    return [];
  }

  const joinedIds = new Set(joined?.map(j => j.groupId) || []);

  // 3. Filter out joined
  return allFrequencies.filter(f => !joinedIds.has(f.id));
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

  // Add creator and invited members (creator has admin rights to invite members)
  const membersToInsert = [
    { groupId: newFreq.id, userId: userData.user.id },
    ...selectedUsers.map(uid => ({ groupId: newFreq.id, userId: uid }))
  ];

  const { error: memberError } = await supabase
    .from('groupMembers')
    .insert(membersToInsert);

  if (memberError) {
    console.error('Error adding members:', memberError);
    return { success: false, error: `Frequency created but failed to add members: ${memberError.message}` };
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

  return data as Frequency;
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
