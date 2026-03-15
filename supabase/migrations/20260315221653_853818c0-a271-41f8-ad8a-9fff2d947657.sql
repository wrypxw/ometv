
-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  coins_reward integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Admin management
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Anyone can read active codes (needed to validate)
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
  FOR SELECT TO public
  USING (active = true);

-- Promo redemptions table
CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  coins_received integer NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read own redemptions
CREATE POLICY "Users can read own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert own redemptions
CREATE POLICY "Users can insert own redemptions" ON public.promo_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins can read all redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
