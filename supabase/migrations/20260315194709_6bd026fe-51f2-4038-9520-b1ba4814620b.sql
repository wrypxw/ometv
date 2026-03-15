
-- Shop packages table
CREATE TABLE public.shop_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coins integer NOT NULL DEFAULT 0,
  bonus integer NOT NULL DEFAULT 0,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can read active packages
CREATE POLICY "Anyone can read packages" ON public.shop_packages
  FOR SELECT TO public USING (true);

-- Only admins can manage packages
CREATE POLICY "Admins can insert packages" ON public.shop_packages
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update packages" ON public.shop_packages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete packages" ON public.shop_packages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default packages
INSERT INTO public.shop_packages (coins, bonus, price_cents, currency, sort_order) VALUES
  (500, 0, 399, 'USD', 1),
  (1000, 120, 749, 'USD', 2),
  (2500, 300, 1749, 'USD', 3),
  (5000, 550, 3349, 'USD', 4),
  (10000, 1100, 6449, 'USD', 5),
  (25000, 2600, 15649, 'USD', 6);
