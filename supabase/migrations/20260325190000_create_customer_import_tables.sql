CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source text,
  primary_email text,
  primary_phone text,
  primary_address_line_1 text,
  primary_suburb text,
  primary_city text,
  primary_postcode text,
  primary_country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'phone')),
  value text NOT NULL,
  label text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, type, value)
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('site', 'postal', 'other')),
  line1 text NOT NULL,
  line2 text,
  suburb text,
  city text,
  postcode text,
  country text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated customers access"
ON public.customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated customer_contacts access"
ON public.customer_contacts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated customer_addresses access"
ON public.customer_addresses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_addresses_dedupe
ON public.customer_addresses (
  customer_id,
  type,
  line1,
  COALESCE(line2, ''),
  COALESCE(suburb, ''),
  COALESCE(city, ''),
  COALESCE(postcode, ''),
  COALESCE(country, '')
);
