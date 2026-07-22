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
export async function createFrequency(name: string, description: string | null, iconFile?: File, isPublic: boolean = true): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  let iconUrl = null;

  // Upload icon if provided
  if (iconFile) {
    const fileExt = iconFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `icons/${userData.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images') // Reusing the existing bucket for simplicity
      .upload(filePath, iconFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
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
      isPublic: isPublic,
      userId: userData.user.id
    })
    .select('id')
    .single();

  if (createError || !newFreq) {
    console.error('Error creating frequency:', createError);
    return false;
  }

  // Add creator as member
  const { error: memberError } = await supabase
    .from('groupMembers')
    .insert({
      groupId: newFreq.id,
      userId: userData.user.id
    });

  if (memberError) {
    console.error('Error adding creator to frequency:', memberError);
    // Ideally we would delete the frequency here if this fails, but skipping for brevity
    return false;
  }

  return true;
}

/**
 * Join a frequency
 */
export async function joinFrequency(frequencyId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  const { error } = await supabase
    .from('groupMembers')
    .insert({
      groupId: frequencyId,
      userId: userData.user.id
    });

  if (error) {
    // If it violates unique constraint (already joined), we can just return true
    if (error.code === '23505') return true; 
    
    console.error('Error joining frequency:', error);
    return false;
  }

  return true;
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
