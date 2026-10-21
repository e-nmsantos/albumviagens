CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  place text NOT NULL,
  date date NOT NULL,
  text text NOT NULL DEFAULT '',
  photos text[] NOT NULL DEFAULT '{}',
  lat double precision,
  lng double precision,
  trip text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT SELECT ON public.memories TO anon;
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.memories FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_public);
CREATE POLICY "public read" ON public.memories FOR SELECT TO anon USING (is_public);
CREATE POLICY "own insert" ON public.memories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.memories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.memories FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.memories(user_id, date DESC);