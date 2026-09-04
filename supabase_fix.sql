-- ==============================================================================
-- Fix Corporate Affiliation (Indirect Route) 
-- Execute this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create or Replace the RPC for requesting company affiliation
-- Adding SECURITY DEFINER allows this function to bypass RLS policies
-- so the insertion will succeed even if the user doesn't have direct INSERT access.
CREATE OR REPLACE FUNCTION request_company_affiliation(target_company_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Bypasses RLS to ensure the INSERT goes through
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_existing_id UUID;
BEGIN
    -- Get the authenticated user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if an affiliation or request already exists to prevent duplicates
    SELECT id INTO v_existing_id 
    FROM company_affiliations 
    WHERE user_id = v_user_id AND company_id = target_company_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- If a record already exists, return early
        RETURN json_build_object('success', true, 'message', 'Affiliation request already exists.');
    END IF;

    -- Insert the new affiliation request with status 'pending'
    INSERT INTO company_affiliations (
        user_id,
        company_id,
        status,
        source
    ) VALUES (
        v_user_id,
        target_company_id,
        'pending',
        'professional' -- Optional: default source value, or adjust as needed
    );

    RETURN json_build_object('success', true, 'message', 'Affiliation request submitted successfully.');
END;
$$;


-- 2. Optional: Adjust RLS Policies if you prefer direct client-side INSERTS
-- (Uncomment and run the below if you want the user to be able to insert directly from the frontend without RPC)

/*
ALTER TABLE company_affiliations ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own affiliation requests
CREATE POLICY "Users can insert their own affiliation requests"
ON company_affiliations
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Allow users to view their own affiliations
CREATE POLICY "Users can view their own affiliations"
ON company_affiliations
FOR SELECT
USING (auth.uid() = user_id);
*/
