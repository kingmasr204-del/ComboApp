-- ComboApp V23: repair infinite-recursion RLS on communities
-- Run this ONCE in Supabase SQL Editor for an existing ComboApp database.
-- This replaces policies that referenced each other (communities <-> community_members)
-- with SECURITY DEFINER helper checks, so creating/listing groups and channels works.

create or replace function public.combo_is_community_owner(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.communities c
    where c.id = p_community_id and c.owner_id = p_user_id
  );
$$;

create or replace function public.combo_is_community_member(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = p_community_id and m.user_id = p_user_id
  );
$$;

revoke all on function public.combo_is_community_owner(uuid,uuid) from public;
revoke all on function public.combo_is_community_member(uuid,uuid) from public;
grant execute on function public.combo_is_community_owner(uuid,uuid) to authenticated;
grant execute on function public.combo_is_community_member(uuid,uuid) to authenticated;

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;

-- Communities
 drop policy if exists communities_member_read on public.communities;
create policy communities_member_read on public.communities
for select to authenticated
using (
  owner_id = auth.uid()
  or public.combo_is_community_member(id, auth.uid())
);

drop policy if exists communities_owner_insert on public.communities;
create policy communities_owner_insert on public.communities
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists communities_owner_update on public.communities;
create policy communities_owner_update on public.communities
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists communities_owner_delete on public.communities;
create policy communities_owner_delete on public.communities
for delete to authenticated
using (owner_id = auth.uid());

-- Members: never query communities through a normal RLS SELECT policy.
drop policy if exists community_members_member_read on public.community_members;
create policy community_members_member_read on public.community_members
for select to authenticated
using (
  user_id = auth.uid()
  or public.combo_is_community_owner(community_id, auth.uid())
);

drop policy if exists community_members_owner_insert on public.community_members;
create policy community_members_owner_insert on public.community_members
for insert to authenticated
with check (
  user_id = auth.uid()
  or public.combo_is_community_owner(community_id, auth.uid())
);

drop policy if exists community_members_owner_update on public.community_members;
create policy community_members_owner_update on public.community_members
for update to authenticated
using (
  user_id = auth.uid()
  or public.combo_is_community_owner(community_id, auth.uid())
)
with check (
  user_id = auth.uid()
  or public.combo_is_community_owner(community_id, auth.uid())
);

drop policy if exists community_members_owner_delete on public.community_members;
create policy community_members_owner_delete on public.community_members
for delete to authenticated
using (
  user_id = auth.uid()
  or public.combo_is_community_owner(community_id, auth.uid())
);

-- Community messages
drop policy if exists community_messages_member_read on public.community_messages;
create policy community_messages_member_read on public.community_messages
for select to authenticated
using (
  public.combo_is_community_member(community_id, auth.uid())
  or public.combo_is_community_owner(community_id, auth.uid())
);

drop policy if exists community_messages_member_insert on public.community_messages;
create policy community_messages_member_insert on public.community_messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.combo_is_community_member(community_id, auth.uid())
    or public.combo_is_community_owner(community_id, auth.uid())
  )
);

select 'ComboApp communities RLS repaired successfully' as status;
