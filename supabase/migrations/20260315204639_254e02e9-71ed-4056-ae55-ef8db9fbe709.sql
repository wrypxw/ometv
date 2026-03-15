
-- Payment transactions table
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.shop_packages(id),
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  coins_amount integer NOT NULL DEFAULT 0,
  bonus_amount integer NOT NULL DEFAULT 0,
  coupon_code text,
  discount_percent integer DEFAULT 0,
  mp_preference_id text,
  mp_payment_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can read all transactions
CREATE POLICY "Admins can read all transactions" ON public.payment_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Users can read own transactions
CREATE POLICY "Users can read own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Only service role inserts/updates (via edge functions)
CREATE POLICY "Service can insert transactions" ON public.payment_transactions
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service can update transactions" ON public.payment_transactions
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
