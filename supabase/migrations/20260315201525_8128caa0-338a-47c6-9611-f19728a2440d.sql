
-- Fix coupons SELECT policy to only expose active, non-expired coupons
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
CREATE POLICY "Anyone can read active coupons"
  ON public.coupons
  FOR SELECT
  TO public
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));
