import { supabase } from '@/lib/supabase';

export interface Frequency {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

/**
 * Fetch frequencies the current user is a member of
 */
export async function fetchJoinedFrequencies(): Promise<Frequency[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  // Query frequency_members and join with frequencies
  const { data, error } = await supabase
    .from('frequency_members')
    .select(`
      frequency_id,
      frequencies (
        id,
        name,
        description,
        icon,
        is_public,
        created_by,
        created_at
      )
    `)
    .eq('user_id', userData.user.id);

  if (error || !data) {
    console.error('Error fetching joined frequencies:', error);
    return [];
  }

  // Extract the inner frequency objects
  return data
    .map((item: any) => item.frequencies as Frequency)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch public frequencies the current user has NOT joined yet
 */
export async function fetchAvailableFrequencies(): Promise<Frequency[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const userId = userData.user.id;

  // Since Supabase RPC or complex NOT IN joins can be tricky over the JS client,
  // we can fetch all public frequencies and all joined frequency IDs, then filter locally.
  // This is fine for small/medium scale.
  
  // 1. Fetch all public frequencies
  const { data: allFrequencies, error: freqError } = await supabase
    .from('frequencies')
    .select('*')
    .eq('is_public', true)
    .order('name');

  if (freqError || !allFrequencies) {
    console.error('Error fetching all frequencies:', freqError);
    return [];
  }

  // 2. Fetch user's joined frequency IDs
  const { data: joined, error: joinedError } = await supabase
    .from('frequency_members')
    .select('frequency_id')
    .eq('user_id', userId);

  if (joinedError) {
    console.error('Error fetching joined frequency IDs:', joinedError);
    return [];
  }

  const joinedIds = new Set(joined?.map(j => j.frequency_id) || []);

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
      console.error('Error uploading icon:', uploadError);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);
      
    iconUrl = publicUrlData.publicUrl;
  }

  // Insert frequency
  const { data: newFreq, error: createError } = await supabase
    .from('frequencies')
    .insert({
      name: name,
      description: description,
      icon: iconUrl,
      is_public: isPublic,
      created_by: userData.user.id
    })
    .select('id')
    .single();

  if (createError || !newFreq) {
    console.error('Error creating frequency:', createError);
    return false;
  }

  // Add creator as member
  const { error: memberError } = await supabase
    .from('frequency_members')
    .insert({
      frequency_id: newFreq.id,
      user_id: userData.user.id
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
    .from('frequency_members')
    .insert({
      frequency_id: frequencyId,
      user_id: userData.user.id
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
    .from('frequencies')
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
    .from('frequency_members')
    .delete()
    .match({
      frequency_id: frequencyId,
      user_id: userData.user.id
    });

  if (error) {
    console.error('Error leaving frequency:', error);
    return false;
  }

  return true;
}
