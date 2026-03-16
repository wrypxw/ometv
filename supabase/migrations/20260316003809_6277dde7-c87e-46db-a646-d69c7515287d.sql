CREATE POLICY "Anyone can read basic profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);