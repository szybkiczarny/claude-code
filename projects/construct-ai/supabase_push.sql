-- Push tokens — już wykonane przez API (2026-04-25)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own token" ON public.push_tokens FOR ALL USING (user_id = auth.uid());
