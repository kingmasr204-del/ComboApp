-- ComboApp V49.1: FIX invite lookup function return-type conflict.
-- IMPORTANT: PostgreSQL cannot change the OUT/RETURNS TABLE row type of an existing function.
-- Drop the old function first, then recreate it with the V49 return columns.

begin;

drop function if exists public.combo_get_community_by_invite(text);

create function public.combo_get_community_by_invite(p_code text)
returns table(
  id uuid,
  kind text,
  name text,
  description text,
  owner_id uuid,
  avatar_url text,
  invite_code text,
  created_at timestamptz,
  allow_join_requests boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.kind,
    c.name,
    c.description,
    c.owner_id,
    c.avatar_url,
    c.invite_code,
    c.created_at,
    c.allow_join_requests
  from public.communities c
  where lower(trim(c.invite_code)) = lower(trim(p_code))
  limit 1;
$$;

grant execute on function public.combo_get_community_by_invite(text) to authenticated;

-- Keep the join RPC repair from V49.
drop function if exists public.combo_v25_join_by_invite(text);

create function public.combo_v25_join_by_invite(p_code text)
returns table(
  id uuid,
  kind text,
  name text,
  description text,
  owner_id uuid,
  avatar_url text,
  invite_code text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.communities%rowtype;
  existing_role text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولًا';
  end if;

  select * into c
  from public.communities
  where lower(trim(invite_code)) = lower(trim(p_code))
  limit 1;

  if c.id is null then
    raise exception 'رابط الجروب أو القناة غير صحيح';
  end if;

  select role into existing_role
  from public.community_members
  where community_id = c.id and user_id = auth.uid();

  if existing_role is not null then
    return query
      select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,'joined'::text;
    return;
  end if;

  if coalesce(c.allow_join_requests,false) then
    insert into public.community_join_requests(community_id,user_id,status)
    values(c.id,auth.uid(),'pending')
    on conflict (community_id,user_id)
    do update set status='pending';

    return query
      select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,'pending'::text;
  else
    insert into public.community_members(community_id,user_id,role)
    values(c.id,auth.uid(),'member')
    on conflict (community_id,user_id) do nothing;

    return query
      select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,'joined'::text;
  end if;
end;
$$;

grant execute on function public.combo_v25_join_by_invite(text) to authenticated;

commit;
