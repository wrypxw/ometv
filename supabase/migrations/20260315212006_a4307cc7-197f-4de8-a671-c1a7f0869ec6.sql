
CREATE TABLE public.gender_coin_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gender_key TEXT NOT NULL UNIQUE,
  gender_label TEXT NOT NULL,
  coin_cost INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gender_coin_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gender prices" ON public.gender_coin_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active gender prices" ON public.gender_coin_prices
  FOR SELECT TO public
  USING (active = true);

-- Insert default values
INSERT INTO public.gender_coin_prices (gender_key, gender_label, coin_cost) VALUES
  ('Male', 'Male', 15),
  ('Female', 'Female', 15),
  ('Both', 'Both', 0);
