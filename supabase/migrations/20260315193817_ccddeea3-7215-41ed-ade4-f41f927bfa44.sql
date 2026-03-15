
-- Site settings table for admin-configurable values
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings" ON public.site_settings
  FOR SELECT TO public USING (true);

-- Only admins can update settings  
CREATE POLICY "Admins can update settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'ChatRandom'),
  ('site_suffix', '.gg'),
  ('logo_url', ''),
  ('favicon_url', ''),
  ('facebook_url', ''),
  ('discord_url', ''),
  ('twitter_url', ''),
  ('instagram_url', ''),
  ('tiktok_url', ''),
  ('shop_enabled', 'true'),
  ('shop_title', 'Shop'),
  ('shop_description', 'Higher tiers give you more bonus coins!');
