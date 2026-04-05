alter table if exists public.suppliers
  add column if not exists last_pricebook_uploaded_at timestamptz,
  add column if not exists last_pricebook_row_count integer;
