import { supabase } from "@/lib/supabase";

export interface BusinessRegistrationData {
  companyTypes: string[]; // array of keys like 'airline', 'charter'
  profile: {
    companyName: string;
    location: string;
    email: string;
    phone?: string;
    website?: string;
    foundedYear?: string;
    description?: string;
    operatingAreas?: string[];
    servicesOffered?: string[];
    fleetTypes?: string[];
    logo?: string | null;
  };
  visibility: {
    advertising: boolean;
    hiringPilots: boolean;
    hiringCabinCrew: boolean;
    offerDiscounts: boolean;
    joinFounding: boolean;
    allowDMs: boolean;
  };
}

export async function registerBusinessAccount(data: BusinessRegistrationData) {
  try {
    // 1. Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Could not find authenticated user.");

    // 2. Insert the company profile
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        owner_user_id: user.id,
        name: data.profile.companyName,
        location: data.profile.location,
        contact_email: data.profile.email,
        phone: data.profile.phone || null,
        website: data.profile.website || null,
        founded_year: data.profile.foundedYear || null,
        description: data.profile.description || null,
        operating_areas: data.profile.operatingAreas || [],
        services: data.profile.servicesOffered || [],
        fleet_types: data.profile.fleetTypes || [],
        status: 'pending'
      })
      .select('id')
      .single();

    if (companyError) throw new Error(`Error creating company: ${companyError.message}`);
    const companyId = company.id;

    // 3. Insert company settings
    const { error: settingsError } = await supabase
      .from('company_settings')
      .insert({
        company_id: companyId,
        interested_in_advertising: data.visibility.advertising,
        interested_in_hiring_pilots: data.visibility.hiringPilots,
        interested_in_hiring_cabin_crew: data.visibility.hiringCabinCrew,
        offers_crew_discounts: data.visibility.offerDiscounts,
        join_founding_partners: data.visibility.joinFounding,
        allow_crew_direct_messages: data.visibility.allowDMs
      });

    if (settingsError) throw new Error(`Error saving settings: ${settingsError.message}`);

    // 4. Handle Company Types
    // First, fetch the UUIDs for the selected string keys (e.g., 'airline', 'fbo')
    if (data.companyTypes.length > 0) {
      const { data: typeRecords, error: typesError } = await supabase
        .from('company_types')
        .select('id, key')
        .in('key', data.companyTypes);

      if (typesError) throw new Error(`Error fetching company types: ${typesError.message}`);

      // Map the found IDs to selections
      if (typeRecords && typeRecords.length > 0) {
        const selections = typeRecords.map(t => ({
          company_id: companyId,
          company_type_id: t.id
        }));

        const { error: selectionsError } = await supabase
          .from('company_type_selections')
          .insert(selections);

        if (selectionsError) throw new Error(`Error saving company types: ${selectionsError.message}`);
      }
    }

    // 5. Update the user record to mark as business and onboarded
    // Note: Assuming 'users' table is public.users
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        accounttype: 'business',
        onboarded: 1
      })
      .eq('id', user.id);

    if (updateUserError) throw new Error(`Error updating user status: ${updateUserError.message}`);

    // 6. Ensure they have a profile so the app doesn't kick them back to onboarding
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: data.profile.companyName,
        avatar_url: data.profile.logo || null
      });
      
    if (profileError) throw new Error(`Error creating profile: ${profileError.message}`);

    return { success: true };
  } catch (error: any) {
    console.error("Business registration failed:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
