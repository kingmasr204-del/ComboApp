-- ComboApp: cloud persistence for user-specific data/settings/contacts.
-- Run ONCE in Supabase SQL Editor.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists user_settings_select on public.user_settings;
create policy user_settings_select on public.user_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists user_settings_insert on public.user_settings;
create policy user_settings_insert on public.user_settings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_settings_update on public.user_settings;
create policy user_settings_update on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_settings_delete on public.user_settings;
create policy user_settings_delete on public.user_settings for delete to authenticated using (user_id = auth.uid());

create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
create index if not exists user_contacts_user_idx on public.user_contacts(user_id, created_at desc);
create unique index if not exists user_contacts_user_phone_uidx on public.user_contacts(user_id, phone);
alter table public.user_contacts enable row level security;
drop policy if exists user_contacts_select on public.user_contacts;
create policy user_contacts_select on public.user_contacts for select to authenticated using (user_id = auth.uid());
drop policy if exists user_contacts_insert on public.user_contacts;
create policy user_contacts_insert on public.user_contacts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_contacts_delete on public.user_contacts;
create policy user_contacts_delete on public.user_contacts for delete to authenticated using (user_id = auth.uid());

-- Profile media persistence.
create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  media_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists profile_media_user_created_idx on public.profile_media(user_id, created_at desc);
alter table public.profile_media enable row level security;
drop policy if exists profile_media_select on public.profile_media;
create policy profile_media_select on public.profile_media for select to authenticated using (true);
drop policy if exists profile_media_insert on public.profile_media;
create policy profile_media_insert on public.profile_media for insert to authenticated with check (user_id = auth.uid());
drop policy if exists profile_media_delete on public.profile_media;
create policy profile_media_delete on public.profile_media for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets(id,name,public) values ('avatars','avatars',true)
on conflict(id) do update set public=true;
drop policy if exists combo_profile_media_insert on storage.objects;
create policy combo_profile_media_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists combo_profile_media_delete on storage.objects;
create policy combo_profile_media_delete on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
