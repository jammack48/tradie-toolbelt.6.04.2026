
CREATE TABLE public.customers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  jobs integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'leads',
  total_spend numeric NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_history jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON public.customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.customers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.customers FOR DELETE TO anon USING (true);
