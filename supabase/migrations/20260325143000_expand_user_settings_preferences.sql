alter table public.user_settings
  add column if not exists show_employee_mode boolean not null default true,
  add column if not exists theme text not null default 'earthy',
  add column if not exists is_dark boolean not null default true,
  add column if not exists toolbar_position text not null default 'left',
  add column if not exists business_profile jsonb null;
