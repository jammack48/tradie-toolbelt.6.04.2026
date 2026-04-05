-- Ensure user_settings structure and secure per-user access in production.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tutorials_enabled boolean not null default true,
  show_timesheet_mode boolean not null default true,
  show_tools_mode boolean not null default true,
  show_employee_mode boolean not null default true,
  theme text not null default 'earthy',
  is_dark boolean not null default true,
  toolbar_position text not null default 'left',
  business_profile jsonb null,
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists user_id uuid,
  add column if not exists tutorials_enabled boolean not null default true,
  add column if not exists show_timesheet_mode boolean not null default true,
  add column if not exists show_tools_mode boolean not null default true,
  add column if not exists show_employee_mode boolean not null default true,
  add column if not exists theme text not null default 'earthy',
  add column if not exists is_dark boolean not null default true,
  add column if not exists toolbar_position text not null default 'left',
  add column if not exists business_profile jsonb null,
  add column if not exists updated_at timestamptz not null default now();

-- Add FK if missing.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_settings_user_id_fkey'
      and conrelid = 'public.user_settings'::regclass
  ) then
    alter table public.user_settings
      add constraint user_settings_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- Ensure PK is on user_id.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_settings'::regclass
      and contype = 'p'
  ) then
    alter table public.user_settings
      add constraint user_settings_pkey primary key (user_id);
  end if;
end $$;

alter table public.user_settings enable row level security;

-- Ensure base grants (RLS still restricts access to own row).
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.user_settings to authenticated;

-- Recreate policies idempotently.
drop policy if exists "User can view own settings" on public.user_settings;
create policy "User can view own settings"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "User can insert own settings" on public.user_settings;
create policy "User can insert own settings"
on public.user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "User can update own settings" on public.user_settings;
create policy "User can update own settings"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
