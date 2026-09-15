-- ==============================================================================
-- Fix Affiliation Approval/Rejection & Permissions
-- Execute this script in your Supabase SQL Editor: Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Grant permissions on company_affiliations to authenticated users
GRANT SELECT, UPDATE ON public.company_affiliations TO authenticated;

-- 2. Create or Replace review_company_affiliation_request with SECURITY DEFINER
-- SECURITY DEFINER ensures the function executes with database owner privileges,
-- avoiding "permission denied for table company_affiliations" errors during review.
CREATE OR REPLACE FUNCTION public.review_company_affiliation_request(
    affiliation_id UUID,
    decision TEXT,
    rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    v_affiliation RECORD;
    v_is_authorized BOOLEAN := FALSE;
    v_normalized_decision TEXT := lower(trim(decision));
    v_new_status TEXT;
BEGIN
    -- Verify authentication
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch the pending affiliation record
    SELECT * INTO v_affiliation
    FROM public.company_affiliations
    WHERE id = affiliation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Affiliation request % not found', affiliation_id;
    END IF;

    IF v_affiliation.status != 'pending' THEN
        -- Already reviewed, return success with current status
        RETURN jsonb_build_object(
            'success', true,
            'message', format('Affiliation is already %s', v_affiliation.status),
            'status', v_affiliation.status
        );
    END IF;

    -- Authorization check:
    -- 1. Check if reviewer is owner of the company
    IF EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = v_affiliation.company_id
        AND owner_user_id = v_reviewer_id
    ) THEN
        v_is_authorized := TRUE;
    END IF;

    -- 2. Check if reviewer is owner or admin in company_members
    IF NOT v_is_authorized AND EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = v_affiliation.company_id
        AND user_id = v_reviewer_id
        AND lower(role) IN ('owner', 'admin')
    ) THEN
        v_is_authorized := TRUE;
    END IF;

    -- 3. Check if reviewer has platform admin role
    IF NOT v_is_authorized AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = v_reviewer_id
        AND lower(coalesce("platformRole", role, '')) = 'admin'
    ) THEN
        v_is_authorized := TRUE;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Not authorized to review requests for this company';
    END IF;

    -- Process approval
    IF v_normalized_decision IN ('approved', 'approve', 'verified') THEN
        v_new_status := 'verified';

        UPDATE public.company_affiliations
        SET 
            status = 'verified',
            reviewed_at = NOW(),
            reviewed_by_user_id = v_reviewer_id,
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE id = affiliation_id;

        -- Sync resumes JSON if user has a resume record
        UPDATE public.resumes
        SET data = jsonb_set(
            jsonb_set(COALESCE(data, '{}'::jsonb), '{personal,companyStatus}', '"verified"'),
            '{personal,companyId}', to_jsonb(v_affiliation.company_id::text)
        )
        WHERE "userId" = v_affiliation.user_id;

    -- Process rejection
    ELSIF v_normalized_decision IN ('rejected', 'reject', 'declined', 'decline') THEN
        v_new_status := 'rejected';

        UPDATE public.company_affiliations
        SET 
            status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by_user_id = v_reviewer_id,
            rejection_reason = rejection_reason,
            is_primary = FALSE,
            updated_at = NOW()
        WHERE id = affiliation_id;

        -- Sync resumes JSON
        UPDATE public.resumes
        SET data = jsonb_set(
            COALESCE(data, '{}'::jsonb),
            '{personal,companyStatus}', '"rejected"'
        )
        WHERE "userId" = v_affiliation.user_id;

    ELSE
        RAISE EXCEPTION 'Invalid decision: %. Must be approved or rejected.', decision;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', v_new_status,
        'message', format('Affiliation request %s successfully', v_new_status)
    );
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.review_company_affiliation_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_company_affiliation_request(UUID, TEXT) TO authenticated;

-- 4. Add RLS policy allowing company owners and admins to UPDATE affiliations directly
DROP POLICY IF EXISTS "Company managers can update affiliation requests" ON public.company_affiliations;

CREATE POLICY "Company managers can update affiliation requests"
ON public.company_affiliations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = company_affiliations.company_id
        AND companies.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_members.company_id = company_affiliations.company_id
        AND company_members.user_id = auth.uid()
        AND lower(company_members.role) IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = company_affiliations.company_id
        AND companies.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_members.company_id = company_affiliations.company_id
        AND company_members.user_id = auth.uid()
        AND lower(company_members.role) IN ('owner', 'admin')
    )
);
