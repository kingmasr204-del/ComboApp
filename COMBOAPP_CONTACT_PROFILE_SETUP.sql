-- ComboApp contact profile controls / privacy / mute / block
-- Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.contact_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  peer_id uuid not null references auth.users(id) on delete cascade,
  muted boolean not null default false,
  calls_blocked boolean not null default false,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, peer_id),
  check (user_id <> peer_id)
);

create index if not exists contact_preferences_user_idx on public.contact_preferences(user_id, peer_id);

alter table public.contact_preferences enable row level security;
drop policy if exists contact_preferences_owner on public.contact_preferences;
create policy contact_preferences_owner on public.contact_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Keep timestamps current when preferences change.
create or replace function public.touch_contact_preferences_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists contact_preferences_updated_at on public.contact_preferences;
create trigger contact_preferences_updated_at
before update on public.contact_preferences
for each row execute function public.touch_contact_preferences_updated_at();
