
-- Add INEP field to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS inep text;

-- Allow public (anon) to view credes for the student form
DROP POLICY IF EXISTS "Anyone authenticated can view credes" ON public.credes;
CREATE POLICY "Anyone can view credes" ON public.credes FOR SELECT USING (true);
