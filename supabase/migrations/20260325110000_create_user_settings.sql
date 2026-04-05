create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tutorials_enabled boolean not null default true,
  show_timesheet_mode boolean not null default true,
  show_tools_mode boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "User can view own settings" on public.user_settings;
create policy "User can view own settings"
on public.user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "User can upsert own settings" on public.user_settings;
create policy "User can upsert own settings"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
