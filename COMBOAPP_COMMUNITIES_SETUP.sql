-- ComboApp: cloud-persisted groups and channels
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'group' check (kind in ('group','channel')),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communities_owner_idx on public.communities(owner_id, created_at desc);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  unique(community_id,user_id)
);
create index if not exists community_members_user_idx on public.community_members(user_id, joined_at desc);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_path text,
  media_mime text,
  created_at timestamptz not null default now()
);
create index if not exists community_messages_idx on public.community_messages(community_id, created_at);

create or replace function public.touch_community_time()
returns trigger language plpgsql as $$
begin
  update public.communities set updated_at=now() where id=new.community_id;
  return new;
end; $$;
drop trigger if exists community_message_time on public.community_messages;
create trigger community_message_time after insert on public.community_messages
for each row execute function public.touch_community_time();

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;

drop policy if exists communities_member_read on public.communities;
create policy communities_member_read on public.communities for select to authenticated
using (owner_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=id and m.user_id=auth.uid()));
drop policy if exists communities_owner_insert on public.communities;
create policy communities_owner_insert on public.communities for insert to authenticated
with check (owner_id=auth.uid());
drop policy if exists communities_owner_update on public.communities;
create policy communities_owner_update on public.communities for update to authenticated
using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists communities_owner_delete on public.communities;
create policy communities_owner_delete on public.communities for delete to authenticated
using (owner_id=auth.uid());

drop policy if exists community_members_member_read on public.community_members;
create policy community_members_member_read on public.community_members for select to authenticated
using (user_id=auth.uid() or exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()));
drop policy if exists community_members_owner_insert on public.community_members;
create policy community_members_owner_insert on public.community_members for insert to authenticated
with check (exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()) or user_id=auth.uid());
drop policy if exists community_members_owner_update on public.community_members;
create policy community_members_owner_update on public.community_members for update to authenticated
using (user_id=auth.uid() or exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()));
drop policy if exists community_members_owner_delete on public.community_members;
create policy community_members_owner_delete on public.community_members for delete to authenticated
using (user_id=auth.uid() or exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()));

drop policy if exists community_messages_member_read on public.community_messages;
create policy community_messages_member_read on public.community_messages for select to authenticated
using (exists(select 1 from public.community_members m where m.community_id=community_id and m.user_id=auth.uid()) or exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()));
drop policy if exists community_messages_member_insert on public.community_messages;
create policy community_messages_member_insert on public.community_messages for insert to authenticated
with check (sender_id=auth.uid() and (exists(select 1 from public.community_members m where m.community_id=community_id and m.user_id=auth.uid()) or exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid())));
