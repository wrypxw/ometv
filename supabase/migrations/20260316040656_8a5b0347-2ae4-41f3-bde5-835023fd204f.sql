
CREATE TABLE public.gifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji text NOT NULL DEFAULT '🎁',
  name text NOT NULL DEFAULT 'Presente',
  coin_cost integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active gifts" ON public.gifts FOR SELECT TO public USING (active = true);
CREATE POLICY "Admins can manage gifts" ON public.gifts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert 3 default gifts
INSERT INTO public.gifts (emoji, name, coin_cost, sort_order) VALUES
  ('🌹', 'Rosa', 5, 1),
  ('💎', 'Diamante', 15, 2),
  ('👑', 'Coroa', 30, 3);
