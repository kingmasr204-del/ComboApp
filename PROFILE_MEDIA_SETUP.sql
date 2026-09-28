-- ComboApp V6 CLOUD DATA REPAIR
-- This migration is designed for an EXISTING ComboApp database.
-- Run this file ONCE in Supabase SQL Editor.
-- It fixes older table versions that used owner_id instead of user_id
-- and safely adds missing columns before creating policies.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) Per-user settings
-- =========================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
drop policy if exists user_settings_select on public.user_settings;
create policy user_settings_select on public.user_settings
  for select to authenticated using (user_id = auth.uid());
drop policy if exists user_settings_insert on public.user_settings;
create policy user_settings_insert on public.user_settings
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_settings_update on public.user_settings;
create policy user_settings_update on public.user_settings
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists user_settings_delete on public.user_settings;
create policy user_settings_delete on public.user_settings
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- 2) Contacts
-- Older ComboApp builds used owner_id/contact_id.
-- The current app uses user_id/name/phone, so add a compatible
-- user_id column without deleting the old data.
-- =========================================================
create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_contacts'
      and column_name='user_id'
  ) then
    alter table public.user_contacts add column user_id uuid references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_contacts'
      and column_name='name'
  ) then
    alter table public.user_contacts add column name text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_contacts'
      and column_name='phone'
  ) then
    alter table public.user_contacts add column phone text;
  end if;
end $$;

-- Backfill from the older owner_id/display_name/contact phone columns when present.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_contacts' and column_name='owner_id') then
    update public.user_contacts
      set user_id = owner_id
      where user_id is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_contacts' and column_name='display_name') then
    update public.user_contacts
      set name = coalesce(name, display_name)
      where name is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_contacts' and column_name='contact_id') then
    -- Keep contact_id for compatibility; the app's local contact list
    -- only requires name/phone.
    null;
  end if;
end $$;

create index if not exists user_contacts_user_idx
  on public.user_contacts(user_id, created_at desc);

create unique index if not exists user_contacts_user_phone_uidx
  on public.user_contacts(user_id, phone)
  where user_id is not null and phone is not null and phone <> '';

alter table public.user_contacts enable row level security;
drop policy if exists user_contacts_owner_all on public.user_contacts;
drop policy if exists user_contacts_select on public.user_contacts;
drop policy if exists user_contacts_insert on public.user_contacts;
drop policy if exists user_contacts_delete on public.user_contacts;
create policy user_contacts_select on public.user_contacts
  for select to authenticated using (user_id = auth.uid());
create policy user_contacts_insert on public.user_contacts
  for insert to authenticated with check (user_id = auth.uid());
create policy user_contacts_delete on public.user_contacts
  for delete to authenticated using (user_id = auth.uid());
create policy user_contacts_update on public.user_contacts
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================
-- 3) Unlimited profile photos/videos
-- =========================================================
create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  media_type text,
  media_path text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profile_media'
      and column_name='user_id'
  ) then
    alter table public.profile_media add column user_id uuid references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profile_media'
      and column_name='media_type'
  ) then
    alter table public.profile_media add column media_type text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profile_media'
      and column_name='media_path'
  ) then
    alter table public.profile_media add column media_path text;
  end if;
end $$;

-- Backfill ownership if an older version called the owner column owner_id.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profile_media' and column_name='owner_id') then
    update public.profile_media
      set user_id = owner_id
      where user_id is null;
  end if;
end $$;

create index if not exists profile_media_user_created_idx
  on public.profile_media(user_id, created_at desc);

alter table public.profile_media enable row level security;
drop policy if exists profile_media_select on public.profile_media;
drop policy if exists profile_media_insert on public.profile_media;
drop policy if exists profile_media_delete on public.profile_media;
create policy profile_media_select on public.profile_media
  for select to authenticated using (true);
create policy profile_media_insert on public.profile_media
  for insert to authenticated with check (user_id = auth.uid());
create policy profile_media_delete on public.profile_media
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- 4) Profile media storage
-- =========================================================
insert into storage.buckets(id,name,public)
values ('avatars','avatars',true)
on conflict(id) do update set public=true;

drop policy if exists combo_profile_media_insert on storage.objects;
create policy combo_profile_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id='avatars'
    and (storage.foldername(name))[1]=auth.uid()::text
  );

drop policy if exists combo_profile_media_delete on storage.objects;
create policy combo_profile_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id='avatars'
    and (storage.foldername(name))[1]=auth.uid()::text
  );

-- Public bucket reads are handled by the bucket's public setting.
-- =========================================================
-- DONE
-- =========================================================
