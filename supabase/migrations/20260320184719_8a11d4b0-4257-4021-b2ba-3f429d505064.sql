
-- Session tracking
CREATE TABLE public.demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read demo_sessions" ON public.demo_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert demo_sessions" ON public.demo_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public delete demo_sessions" ON public.demo_sessions FOR DELETE TO anon USING (true);

-- Per-session job copies
CREATE TABLE public.demo_session_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.demo_sessions(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  client text NOT NULL,
  job_name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  age_days integer NOT NULL DEFAULT 0,
  urgent boolean NOT NULL DEFAULT false,
  stage text NOT NULL DEFAULT 'Lead',
  has_unread boolean NOT NULL DEFAULT false,
  trade text NOT NULL
);

ALTER TABLE public.demo_session_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read session_jobs" ON public.demo_session_jobs FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert session_jobs" ON public.demo_session_jobs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update session_jobs" ON public.demo_session_jobs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public delete session_jobs" ON public.demo_session_jobs FOR DELETE TO anon USING (true);

CREATE INDEX idx_session_jobs_session_id ON public.demo_session_jobs(session_id);

-- Function to initialize a session by copying template jobs
CREATE OR REPLACE FUNCTION public.init_demo_session(p_session_id uuid, p_trade text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.demo_sessions (id, trade) VALUES (p_session_id, p_trade)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.demo_session_jobs (session_id, job_id, client, job_name, value, age_days, urgent, stage, has_unread, trade)
  SELECT p_session_id, job_id, client, job_name, value, age_days, urgent, stage, has_unread, trade
  FROM public.demo_jobs
  WHERE trade = p_trade;
END;
$$;

-- Cleanup function for old sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.demo_sessions WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Add public RLS to demo_jobs template table
CREATE POLICY "Public read demo_jobs" ON public.demo_jobs FOR SELECT TO anon USING (true);
