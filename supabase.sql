-- ComboApp FINAL / production-prep SQL
-- Run once in Supabase SQL Editor after backing up any existing policies.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists avatar_url text;
alter table public.conversations add column if not exists updated_at timestamptz default now();
alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists message_type text default 'text';

-- Unique username.
create unique index if not exists profiles_username_lower_uidx on public.profiles(lower(username));

-- Per-user chat settings: archive + chat PIN.
create table if not exists public.conversation_settings(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  archived boolean not null default false,
  locked boolean not null default false,
  pin_hash text,
  created_at timestamptz default now(),
  unique(user_id, conversation_id)
);

create table if not exists public.call_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  peer_id uuid references auth.users(id) on delete set null,
  call_type text not null default 'audio',
  status text not null default 'ended',
  created_at timestamptz default now()
);
create index if not exists call_history_user_idx on public.call_history(user_id,created_at desc);

-- Automatically create a profile after email signup. This fixes the old
-- "تم إنشاء الحساب لكن تعذر الحفظ" problem caused by trying to insert as anon.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  base_username := regexp_replace(base_username,'[^a-z0-9_]','','g');
  if length(base_username) < 3 then base_username := 'user_' || substr(new.id::text,1,8); end if;
  insert into public.profiles(id,display_name,username,avatar_url)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'مستخدم'),
    left(base_username,24),
    null
  )
  on conflict (id) do update set
    display_name=excluded.display_name,
    username=excluded.username;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_combo on auth.users;
create trigger on_auth_user_created_combo
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Conversation timestamp trigger.
create or replace function public.update_conversation_time()
returns trigger language plpgsql as $$
begin
  update public.conversations set updated_at=now() where id=new.conversation_id;
  return new;
end; $$;
drop trigger if exists update_conversation_time_trigger on public.messages;
create trigger update_conversation_time_trigger after insert on public.messages
for each row execute function public.update_conversation_time();

-- RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.conversation_settings enable row level security;
alter table public.call_history enable row level security;

-- Profiles
 drop policy if exists profiles_auth_read on public.profiles;
create policy profiles_auth_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

-- Conversations
 drop policy if exists conversations_member_read on public.conversations;
create policy conversations_member_read on public.conversations for select to authenticated using (user1_id=auth.uid() or user2_id=auth.uid());
drop policy if exists conversations_member_insert on public.conversations;
create policy conversations_member_insert on public.conversations for insert to authenticated with check (user1_id=auth.uid() or user2_id=auth.uid());
drop policy if exists conversations_member_update on public.conversations;
create policy conversations_member_update on public.conversations for update to authenticated using (user1_id=auth.uid() or user2_id=auth.uid()) with check (user1_id=auth.uid() or user2_id=auth.uid());

-- Messages
 drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages for select to authenticated using (sender_id=auth.uid() or receiver_id=auth.uid());
drop policy if exists messages_sender_insert on public.messages;
create policy messages_sender_insert on public.messages for insert to authenticated with check (sender_id=auth.uid() and (receiver_id=auth.uid() or exists(select 1 from public.conversations c where c.id=conversation_id and (c.user1_id=auth.uid() or c.user2_id=auth.uid()))));
drop policy if exists messages_member_update on public.messages;
create policy messages_member_update on public.messages for update to authenticated using (receiver_id=auth.uid() or sender_id=auth.uid()) with check (receiver_id=auth.uid() or sender_id=auth.uid());

-- Stories
 drop policy if exists stories_auth_read on public.stories;
create policy stories_auth_read on public.stories for select to authenticated using (expires_at>now());
drop policy if exists stories_own_insert on public.stories;
create policy stories_own_insert on public.stories for insert to authenticated with check (user_id=auth.uid());
drop policy if exists stories_own_delete on public.stories;
create policy stories_own_delete on public.stories for delete to authenticated using (user_id=auth.uid());

-- Story views
 drop policy if exists story_views_auth_read on public.story_views;
create policy story_views_auth_read on public.story_views for select to authenticated using (viewer_id=auth.uid());
drop policy if exists story_views_own_insert on public.story_views;
create policy story_views_own_insert on public.story_views for insert to authenticated with check (viewer_id=auth.uid());

-- Conversation settings
 drop policy if exists conversation_settings_owner on public.conversation_settings;
create policy conversation_settings_owner on public.conversation_settings for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Call history
 drop policy if exists call_history_owner on public.call_history;
create policy call_history_owner on public.call_history for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Sarhny owner read; public sending remains through the SECURITY DEFINER RPC.
alter table public.sarhny_messages enable row level security;
drop policy if exists sarhny_owner_select on public.sarhny_messages;
create policy sarhny_owner_select on public.sarhny_messages for select to authenticated using (recipient_id=auth.uid());
grant execute on function public.send_sarhny_message(text,text) to anon,authenticated;

-- Realtime: message updates.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

-- Realtime private channels for call signaling.
-- The client uses private channel names: call-<conversation_uuid>.
do $$
begin
  execute 'drop policy if exists combo_call_receive on realtime.messages';
  execute 'create policy combo_call_receive on realtime.messages for select to authenticated using (split_part(realtime.topic(), ''call-'', 2)::uuid in (select id from public.conversations where user1_id=auth.uid() or user2_id=auth.uid()))';
  execute 'drop policy if exists combo_call_send on realtime.messages';
  execute 'create policy combo_call_send on realtime.messages for insert to authenticated with check (split_part(realtime.topic(), ''call-'', 2)::uuid in (select id from public.conversations where user1_id=auth.uid() or user2_id=auth.uid()))';
exception when others then
  raise notice 'Realtime policy creation may need to be run manually if your Supabase version does not expose realtime.topic().';
end $$;

-- Email confirmation/password reset settings are configured in the Dashboard:
-- Authentication > Providers > Email: Confirm email = ON.
-- Authentication > URL Configuration: Site URL = YOUR HTTPS APP URL.
-- Redirect URLs: add YOUR HTTPS APP URL and the recovery path if used.
-- For sender name "ComboApp" instead of Supabase: configure custom SMTP.

-- Contacts / WhatsApp-style contact matching
alter table public.profiles add column if not exists phone text;
create unique index if not exists profiles_phone_uidx on public.profiles(phone) where phone is not null and phone <> '';

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  normalized_phone text;
begin
  base_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  base_username := regexp_replace(base_username,'[^a-z0-9_]','','g');
  if length(base_username) < 3 then base_username := 'user_' || substr(new.id::text,1,8); end if;
  normalized_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9]','','g');
  if normalized_phone like '0020%' then normalized_phone := substr(normalized_phone,3); end if;
  if normalized_phone like '0%' then normalized_phone := '20' || substr(normalized_phone,2); end if;
  if normalized_phone <> '' and exists(select 1 from public.profiles where phone=normalized_phone and id<>new.id) then normalized_phone := null; end if;
  insert into public.profiles(id,display_name,username,phone,avatar_url)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'مستخدم'),left(base_username,24),nullif(normalized_phone,''),null)
  on conflict (id) do update set display_name=excluded.display_name, username=excluded.username, phone=coalesce(excluded.phone,public.profiles.phone);
  return new;
end;
$$;
