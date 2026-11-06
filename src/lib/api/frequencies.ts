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

  // 1. Try atomic create_frequency RPC first
  const inviteeIds = selectedUsers.filter((id) => id !== userData.user.id);
  try {
    const { data: createdGroup, error: rpcError } = await supabase.rpc("create_frequency", {
      p_name: name,
      p_description: description || null,
      p_image: iconUrl || null,
      p_is_public: isPublic ? 1 : 0,
      p_invitee_ids: inviteeIds,
    });

    if (!rpcError && createdGroup) {
      return { success: true };
    }
    if (rpcError) {
      console.warn("create_frequency RPC returned error, attempting fallback insert:", rpcError);
    }
  } catch (rpcErr) {
    console.warn("create_frequency RPC failed, falling back to manual creation:", rpcErr);
  }

  // Fallback insert if RPC is unavailable
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

  // 1. Try atomic join_public_frequency RPC first
  try {
    const { data: memberData, error: joinRpcError } = await supabase.rpc("join_public_frequency", {
      p_group_id: targetGroupId,
    });
    if (!joinRpcError && memberData) {
      return { success: true };
    }
  } catch {}

  // 2. Check if user is ALREADY a member
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
 * Uses RPC leave_frequency (handles admin succession and last-member deletion atomically)
 */
export async function leaveFrequency(frequencyId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  // 1. Try atomic leave_frequency RPC
  try {
    const { error: rpcError } = await supabase.rpc("leave_frequency", {
      p_group_id: frequencyId,
    });
    if (!rpcError) {
      return true;
    }
    console.warn("leave_frequency RPC error, falling back to delete:", rpcError);
  } catch (err) {
    console.warn("leave_frequency RPC exception, falling back:", err);
  }

  // 2. Fallback manual delete
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

/**
 * Update current member's notification preference for a frequency
 * Calls RPC set_frequency_notifications
 */
export async function setFrequencyNotifications(
  frequencyId: string | number,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc("set_frequency_notifications", {
      p_group_id: frequencyId,
      p_enabled: enabled,
    });
    if (error) {
      console.error("Error setting frequency notifications:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Exception setting frequency notifications:", err);
    return { success: false, error: err?.message };
  }
}

export interface FrequencyMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  groupRole?: 'admin' | 'member';
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

    const memberRoleMap = new Map(
      membersData.map((m: any) => [m.userId || m.user_id, m.role || "member"])
    );

    const result = userIds.map((uid) => {
      const u = usersMap.get(uid) as any;
      const r = resumesMap.get(uid) as any;
      const c = companiesMap.get(uid) as any;

      // Check if logged-in user has local storage photo/name fallback
      let localPhoto: string | null = null;
      let localFirstName: string | null = null;
      let localLastName: string | null = null;
      let localCompanyName: string | null = null;
      if (typeof window !== "undefined" && uid === currentUserId) {
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

      const firstName = u?.firstName || r?.personal?.firstName || localFirstName || "";
      const lastName = u?.lastName || r?.personal?.lastName || localLastName || "";
      const fullName = `${firstName} ${lastName}`.trim();

      const isBusinessAccount = u?.accountType === "business" || !!c || !!localCompanyName;

      const name =
        c?.name ||
        u?.companyName ||
        localCompanyName ||
        (isBusinessAccount && u?.username && u.username !== "user" ? u.username : null) ||
        fullName ||
        u?.username ||
        (isBusinessAccount ? "Corporate Account" : "Member");

      const role =
        c?.company_type ||
        (isBusinessAccount
          ? "Corporate associate account"
          : u?.position || r?.personal?.position || r?.work?.position || "Pilot");

      const avatar =
        localPhoto ||
        c?.logo_url ||
        u?.profileImage ||
        r?.personal?.profilePhoto ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || uid)}`;

      const groupRole: "admin" | "member" =
        (memberRoleMap.get(uid) as any) === "admin" ? "admin" : "member";

      return {
        id: uid,
        name,
        role,
        avatar,
        groupRole,
      };
    });

    // List admins first, then other joined members alphabetically
    return result.sort((a, b) => {
      if (a.groupRole === "admin" && b.groupRole !== "admin") return -1;
      if (a.groupRole !== "admin" && b.groupRole === "admin") return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    console.error("Error fetching frequency members:", err);
    return [];
  }
}

export interface AdminInvitationItem {
  id: string | number;
  group_id: string | number;
  recipient_id: string;
  invited_by?: string | null;
  status: "pending" | "declined" | "accepted" | "revoked";
  created_at: string;
  sent_at?: string;
  responded_at?: string;
  revoked_at?: string;
  request_id?: string | null;
  // Enriched user details
  recipient?: {
    id: string;
    name: string;
    avatar: string;
    role?: string;
  };
}

/**
 * List latest relevant invitations per non-member for Frequency Admins
 * Calls RPC list_frequency_invitations
 */
export async function listFrequencyInvitations(
  groupId: string | number,
  limit = 50,
  beforeId: string | number | null = null
): Promise<{ invitations: AdminInvitationItem[]; nextCursor: string | number | null; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("list_frequency_invitations", {
      p_group_id: groupId,
      p_limit: limit,
      p_before_id: beforeId ?? null,
    });

    if (error) {
      console.error("Error calling list_frequency_invitations:", error);
      return { invitations: [], nextCursor: null, error: error.message || "Failed to load invitations" };
    }

    const rows: any[] = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return { invitations: [], nextCursor: null };
    }

    const recipientIds = Array.from(new Set(rows.map((r) => r.recipient_id).filter(Boolean)));
    const { data: usersData } = await supabase
      .from("users")
      .select("id, firstName, lastName, username, profileImage, position, companyName")
      .in("id", recipientIds);

    const userMap = new Map((usersData || []).map((u) => [u.id, u]));

    const enriched: AdminInvitationItem[] = rows.map((inv) => {
      const u = userMap.get(inv.recipient_id);
      const fn = u?.firstName || "";
      const ln = u?.lastName || "";
      const fullName = [fn, ln].filter(Boolean).join(" ").trim();
      const displayName = fullName || u?.companyName || u?.username || "Invited User";
      const avatar =
        u?.profileImage ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || inv.recipient_id)}`;
      const role = u?.position || "Member";

      return {
        ...inv,
        recipient: {
          id: inv.recipient_id,
          name: displayName,
          avatar,
          role,
        },
      };
    });

    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    return { invitations: enriched, nextCursor };
  } catch (err: any) {
    console.error("Exception calling list_frequency_invitations:", err);
    return { invitations: [], nextCursor: null, error: err?.message || "Failed to load invitations" };
  }
}

export interface IssueInvitationResult {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  requestId: string;
}

/**
 * Issue or resend a frequency invitation
 * Calls RPC issue_frequency_invitation
 */
export async function issueFrequencyInvitation(
  groupId: string | number,
  recipientId: string,
  previousInvitationId: string | number | null = null,
  retryRequestId?: string
): Promise<IssueInvitationResult> {
  // Retain the operation UUID on ambiguous network failure
  const requestId = retryRequestId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  try {
    const { data, error } = await supabase.rpc("issue_frequency_invitation", {
      p_group_id: groupId,
      p_recipient_id: recipientId,
      p_request_id: requestId,
      p_previous_invitation_id: previousInvitationId,
    });

    if (error) {
      console.error("Error issuing frequency invitation:", error);
      let userFriendlyMsg = error.message || error.details || "Failed to send invitation";

      if (error.code === "42501") {
        userFriendlyMsg = "You must be a frequency admin to send or resend invitations.";
      } else if (error.code === "55000") {
        userFriendlyMsg = "Cooldown active or maximum sends reached (wait 60 seconds or max 3 per 24 hours).";
      } else if (error.code === "22023") {
        userFriendlyMsg = "Invalid invitation attempt state. Please refresh the page.";
      }

      return {
        success: false,
        error: userFriendlyMsg,
        errorCode: error.code,
        requestId,
      };
    }

    return {
      success: true,
      data,
      requestId,
    };
  } catch (err: any) {
    console.error("Exception issuing frequency invitation:", err);
    return {
      success: false,
      error: err?.message || "Failed to send invitation",
      requestId,
    };
  }
}

export interface FrequencyInvitation {
  id: string | number;
  group_id: string | number;
  recipient_id: string;
  invited_by?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  created_at?: string;
  sent_at?: string;
  responded_at?: string;
  revoked_at?: string;
  request_id?: string | null;
}

export interface RespondFrequencyInvitationResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Fetch a frequency invitation record by ID
 */
export async function fetchFrequencyInvitation(
  invitationId: string | number
): Promise<FrequencyInvitation | null> {
  try {
    const { data, error } = await supabase
      .from('frequency_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as FrequencyInvitation;
  } catch (err) {
    console.error('Error fetching frequency invitation:', err);
    return null;
  }
}

/**
 * Respond to a frequency invitation using RPC respond_frequency_invitation_v2
 */
export async function respondFrequencyInvitation(
  invitationId: string | number,
  decision: 'accepted' | 'declined'
): Promise<RespondFrequencyInvitationResult> {
  try {
    const { data, error } = await supabase.rpc('respond_frequency_invitation_v2', {
      p_invitation_id: invitationId,
      p_decision: decision
    });

    if (error) {
      console.error(`Error responding (${decision}) to frequency invitation:`, error);
      return {
        success: false,
        error: error.message || error.details || `Failed to ${decision} invitation`
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(`Exception responding (${decision}) to frequency invitation:`, err);
    return {
      success: false,
      error: err?.message || `Failed to ${decision} invitation`
    };
  }
}


