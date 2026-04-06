CREATE TABLE public.demo_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade text NOT NULL,
  job_id text NOT NULL,
  client text NOT NULL,
  job_name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  age_days integer NOT NULL DEFAULT 0,
  urgent boolean NOT NULL DEFAULT false,
  stage text NOT NULL DEFAULT 'Lead',
  has_unread boolean NOT NULL DEFAULT false
);

ALTER TABLE public.demo_jobs DISABLE ROW LEVEL SECURITY;