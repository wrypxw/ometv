-- Matchmaking queue table
CREATE TABLE public.match_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
  matched_with TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read queue" ON public.match_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can insert to queue" ON public.match_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update queue" ON public.match_queue FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete from queue" ON public.match_queue FOR DELETE USING (true);

-- Signaling table for WebRTC offer/answer/ICE candidates
CREATE TABLE public.signaling (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate')),
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signaling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read signaling" ON public.signaling FOR SELECT USING (true);
CREATE POLICY "Anyone can insert signaling" ON public.signaling FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete signaling" ON public.signaling FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.signaling;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;

CREATE OR REPLACE FUNCTION public.cleanup_old_queue_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.match_queue WHERE created_at < now() - interval '5 minutes';
  DELETE FROM public.signaling WHERE created_at < now() - interval '5 minutes';
END;
$$;