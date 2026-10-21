CREATE TABLE public.wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  place text NOT NULL,
  note text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishes TO authenticated;
GRANT ALL ON public.wishes TO service_role;
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishes" ON public.wishes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);