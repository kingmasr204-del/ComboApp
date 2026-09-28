-- ComboApp V11: username visibility privacy
-- Run once in Supabase SQL Editor.
-- Values: everyone | contacts | nobody
alter table public.profiles
  add column if not exists username_visibility text not null default 'everyone';

update public.profiles
set username_visibility='everyone'
where username_visibility is null or username_visibility not in ('everyone','contacts','nobody');

alter table public.profiles
  drop constraint if exists profiles_username_visibility_check;
alter table public.profiles
  add constraint profiles_username_visibility_check
  check (username_visibility in ('everyone','contacts','nobody'));

-- Useful index for contact-based visibility checks.
create index if not exists profiles_username_visibility_idx
  on public.profiles(username_visibility);
