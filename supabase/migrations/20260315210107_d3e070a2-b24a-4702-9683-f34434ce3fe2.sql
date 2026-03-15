
CREATE TABLE public.region_coin_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_type text NOT NULL DEFAULT 'country',
  region_code text NOT NULL,
  region_name text NOT NULL,
  parent_code text,
  coin_cost integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(region_type, region_code)
);

ALTER TABLE public.region_coin_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active region prices" ON public.region_coin_prices
  FOR SELECT TO public USING (active = true);

CREATE POLICY "Admins can manage region prices" ON public.region_coin_prices
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
