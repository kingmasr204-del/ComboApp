-- ComboApp V24: community invite links + joining by link
-- Run once in Supabase SQL Editor after the previous communities RLS repair.

alter table public.communities add column if not exists invite_code text;
alter table public.communities alter column invite_code set default lower(substr(replace(gen_random_uuid()::text,'-',''),1,12));

update public.communities
set invite_code = lower(substr(replace(gen_random_uuid()::text,'-',''),1,12))
where invite_code is null or invite_code='';

create unique index if not exists communities_invite_code_uidx
on public.communities(invite_code)
where invite_code is not null;

create or replace function public.combo_get_community_by_invite(p_code text)
returns table(id uuid, kind text, name text, description text, owner_id uuid, avatar_url text, invite_code text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,c.created_at
  from public.communities c
  where c.invite_code = lower(trim(p_code))
  limit 1;
$$;

create or replace function public.combo_join_community_by_invite(p_code text)
returns table(id uuid, kind text, name text, description text, owner_id uuid, avatar_url text, invite_code text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.communities%rowtype;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولًا';
  end if;

  select * into c from public.communities
  where invite_code = lower(trim(p_code))
  limit 1;

  if c.id is null then
    raise exception 'رابط الجروب أو القناة غير صحيح';
  end if;

  insert into public.community_members(community_id,user_id,role)
  values(c.id,auth.uid(),'member')
  on conflict (community_id,user_id) do nothing;

  return query select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,c.created_at;
end;
$$;

revoke all on function public.combo_get_community_by_invite(text) from public;
revoke all on function public.combo_join_community_by_invite(text) from public;
grant execute on function public.combo_get_community_by_invite(text) to authenticated;
grant execute on function public.combo_join_community_by_invite(text) to authenticated;

select 'ComboApp V24 community invite upgrade completed' as status;
