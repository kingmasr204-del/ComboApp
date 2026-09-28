-- ComboApp V2 fixes: calls, chat media, story privacy, contacts
-- Run ONCE in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ---------- Call history ----------
create table if not exists public.call_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  peer_id uuid references auth.users(id) on delete set null,
  call_type text not null default 'audio',
  status text not null default 'ended',
  duration_seconds integer not null default 0,
  created_at timestamptz default now()
);
alter table public.call_history add column if not exists duration_seconds integer not null default 0;
alter table public.call_history enable row level security;
drop policy if exists call_history_owner on public.call_history;
create policy call_history_owner on public.call_history for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
create index if not exists call_history_user_idx on public.call_history(user_id,created_at desc);

-- ---------- Chat attachments ----------
alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists media_mime text;

insert into storage.buckets(id,name,public)
values ('chat-media','chat-media',false)
on conflict(id) do update set public=false;

drop policy if exists combo_chat_media_insert on storage.objects;
create policy combo_chat_media_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='chat-media'
  and (storage.foldername(name))[1] in (
    select c.id::text from public.conversations c
    where c.user1_id=auth.uid() or c.user2_id=auth.uid()
  )
);

drop policy if exists combo_chat_media_read on storage.objects;
create policy combo_chat_media_read on storage.objects
for select to authenticated
using (
  bucket_id='chat-media'
  and (storage.foldername(name))[1] in (
    select c.id::text from public.conversations c
    where c.user1_id=auth.uid() or c.user2_id=auth.uid()
  )
);

drop policy if exists combo_chat_media_delete on storage.objects;
create policy combo_chat_media_delete on storage.objects
for delete to authenticated
using (
  bucket_id='chat-media'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- ---------- Real contact list ----------
create table if not exists public.user_contacts(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references auth.users(id) on delete cascade,
  phone text,
  display_name text,
  created_at timestamptz default now(),
  unique(owner_id,contact_id),
  unique(owner_id,phone)
);
alter table public.user_contacts enable row level security;
drop policy if exists user_contacts_owner_all on public.user_contacts;
create policy user_contacts_owner_all on public.user_contacts for all to authenticated
using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create index if not exists user_contacts_owner_idx on public.user_contacts(owner_id);

-- ---------- Story audience ----------
alter table public.stories add column if not exists visibility text not null default 'contacts';
alter table public.stories add column if not exists excluded_user_ids uuid[] not null default '{}';
alter table public.stories add column if not exists selected_user_ids uuid[] not null default '{}';

-- Replace the old "everyone in conversations" policy with the selected audience policy.
drop policy if exists stories_auth_read on public.stories;
create policy stories_auth_read on public.stories
for select to authenticated
using (
  expires_at > now()
  and (
    user_id = auth.uid()
    or visibility = 'everyone'
    or (
      visibility = 'contacts'
      and exists(
        select 1 from public.user_contacts uc
        where uc.owner_id=stories.user_id and uc.contact_id=auth.uid()
      )
      and not (auth.uid() = any(coalesce(excluded_user_ids,'{}'::uuid[])))
    )
    or (
      visibility = 'recent'
      and exists(
        select 1 from public.conversations c
        where (c.user1_id=stories.user_id and c.user2_id=auth.uid())
           or (c.user2_id=stories.user_id and c.user1_id=auth.uid())
      )
    )
    or (
      visibility = 'selected'
      and auth.uid() = any(coalesce(selected_user_ids,'{}'::uuid[]))
    )
  )
);

-- Keep story media readable only when the story itself is readable.
drop policy if exists stories_media_read on storage.objects;
create policy stories_media_read on storage.objects
for select to authenticated
using (
  bucket_id='stories'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or exists(
      select 1 from public.stories s
      where s.media_path=name
        and s.expires_at>now()
        and (
          s.user_id=auth.uid()
          or s.visibility='everyone'
          or (
            s.visibility='contacts'
            and exists(select 1 from public.user_contacts uc where uc.owner_id=s.user_id and uc.contact_id=auth.uid())
            and not (auth.uid()=any(coalesce(s.excluded_user_ids,'{}'::uuid[])))
          )
          or (
            s.visibility='recent'
            and exists(select 1 from public.conversations c where (c.user1_id=s.user_id and c.user2_id=auth.uid()) or (c.user2_id=s.user_id and c.user1_id=auth.uid()))
          )
          or (s.visibility='selected' and auth.uid()=any(coalesce(s.selected_user_ids,'{}'::uuid[])))
        )
    )
  )
);

-- Make sure authenticated users can read profiles and update their own last_seen.
-- Existing policies remain compatible.
