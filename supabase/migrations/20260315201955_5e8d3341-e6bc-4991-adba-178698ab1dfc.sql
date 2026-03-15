
-- Create follows table for the follow/unfollow system
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Users can see their own follows (who they follow and who follows them)
CREATE POLICY "Users can read own follows"
  ON public.follows FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

-- Users can follow others
CREATE POLICY "Users can insert own follows"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- Users can unfollow
CREATE POLICY "Users can delete own follows"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- Enable realtime for follows
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
