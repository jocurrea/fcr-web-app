-- ==============================================================================
-- Migration: Feed Polls (HU-07)
-- Table definitions for immutable feed polls & single final voting
-- Execute this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  question TEXT,
  options JSONB NOT NULL, -- Array of { id: number, text: string }
  duration TEXT NOT NULL CHECK (duration IN ('24h', '3d', '7d')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by post
CREATE INDEX IF NOT EXISTS idx_polls_post_id ON public.polls(post_id);

-- 2. Create Poll Votes Table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- HU-07 Acceptance Criteria 5: Single & Final Vote (Strictly 1 vote per user per poll/post)
  CONSTRAINT unique_poll_user_vote UNIQUE (post_id, user_id)
);

-- Indexes for vote counting and user vote lookup
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read polls
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON public.polls;
CREATE POLICY "Polls are viewable by everyone"
ON public.polls FOR SELECT
USING (true);

-- Authenticated users can insert polls
DROP POLICY IF EXISTS "Authenticated users can create polls" ON public.polls;
CREATE POLICY "Authenticated users can create polls"
ON public.polls FOR INSERT
TO authenticated
WITH CHECK (true);

-- Strict Immutability: Prevent modification of published polls
DROP POLICY IF EXISTS "Polls are immutable once published" ON public.polls;
CREATE POLICY "Polls are immutable once published"
ON public.polls FOR UPDATE
USING (false);

-- Everyone can read poll votes
DROP POLICY IF EXISTS "Poll votes are viewable by authenticated users" ON public.poll_votes;
CREATE POLICY "Poll votes are viewable by authenticated users"
ON public.poll_votes FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert exactly 1 vote
DROP POLICY IF EXISTS "Users can cast exactly one vote" ON public.poll_votes;
CREATE POLICY "Users can cast exactly one vote"
ON public.poll_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Single & Final Vote: Prevent updating votes
DROP POLICY IF EXISTS "Poll votes cannot be edited" ON public.poll_votes;
CREATE POLICY "Poll votes cannot be edited"
ON public.poll_votes FOR UPDATE
USING (false);

