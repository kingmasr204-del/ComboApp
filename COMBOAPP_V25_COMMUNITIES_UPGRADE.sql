-- ComboApp V25: full community management + join requests + media
alter table public.communities add column if not exists allow_info_edit boolean not null default true;
alter table public.communities add column if not exists admins_only_chat boolean not null default false;
alter table public.communities add column if not exists allow_join_requests boolean not null default false;

create table if not exists public.community_join_requests(
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists community_join_requests_pending_uidx
on public.community_join_requests(community_id,user_id) where status='pending';

create table if not exists public.community_reports(
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.community_media(
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_path text not null,
  media_mime text,
  created_at timestamptz not null default now()
);

alter table public.community_join_requests enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_media enable row level security;

drop policy if exists combo_community_reports_insert on public.community_reports;
create policy combo_community_reports_insert on public.community_reports for insert to authenticated with check(reporter_id=auth.uid());

drop policy if exists combo_community_media_insert on public.community_media;
create policy combo_community_media_insert on public.community_media for insert to authenticated with check(user_id=auth.uid());
drop policy if exists combo_community_media_read on public.community_media;
create policy combo_community_media_read on public.community_media for select to authenticated using(user_id=auth.uid());

-- Public bucket for community profile/gallery media. Files are namespaced by the uploader UUID.
insert into storage.buckets(id,name,public)
values('community-media','community-media',true)
on conflict(id) do update set public=true;

drop policy if exists combo_community_media_storage_insert on storage.objects;
create policy combo_community_media_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists combo_community_media_storage_delete on storage.objects;
create policy combo_community_media_storage_delete on storage.objects for delete to authenticated
using(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists combo_community_media_storage_read on storage.objects;
create policy combo_community_media_storage_read on storage.objects for select to public
using(bucket_id='community-media');

create or replace function public.combo_v25_get_community_members(p_community_id uuid)
returns table(user_id uuid, role text, display_name text, username text, avatar_url text, joined_at timestamptz)
language sql security definer set search_path=public
as $$
  select m.user_id,m.role,p.display_name,p.username,p.avatar_url,m.joined_at
  from public.community_members m
  left join public.profiles p on p.id=m.user_id
  where m.community_id=p_community_id
  order by case when m.role='owner' then 0 when m.role='admin' then 1 else 2 end,m.joined_at;
$$;

grant execute on function public.combo_v25_get_community_members(uuid) to authenticated;

create or replace function public.combo_v25_manage_member(p_community_id uuid,p_user_id uuid,p_action text)
returns text
language plpgsql security definer set search_path=public
as $$
declare r text;
begin
  if not exists(select 1 from public.communities where id=p_community_id and owner_id=auth.uid()) then raise exception 'المالك فقط يستطيع إدارة الأعضاء'; end if;
  if p_action='promote' then
    update public.community_members set role='admin' where community_id=p_community_id and user_id=p_user_id and role='member';
    r='promoted';
  elsif p_action='demote' then
    update public.community_members set role='member' where community_id=p_community_id and user_id=p_user_id and role='admin';
    r='demoted';
  elsif p_action='kick' then
    delete from public.community_members where community_id=p_community_id and user_id=p_user_id and role<>'owner';
    r='kicked';
  else raise exception 'إجراء غير معروف'; end if;
  return r;
end;
$$;
grant execute on function public.combo_v25_manage_member(uuid,uuid,text) to authenticated;

create or replace function public.combo_v25_set_community_settings(p_community_id uuid,p_allow_info_edit boolean,p_admins_only_chat boolean,p_allow_join_requests boolean)
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.communities where id=p_community_id and owner_id=auth.uid()) then raise exception 'المالك فقط يستطيع تغيير إعدادات المجموعة'; end if;
  update public.communities set allow_info_edit=p_allow_info_edit,admins_only_chat=p_admins_only_chat,allow_join_requests=p_allow_join_requests,updated_at=now() where id=p_community_id;
  return true;
end;
$$;
grant execute on function public.combo_v25_set_community_settings(uuid,boolean,boolean,boolean) to authenticated;

create or replace function public.combo_v25_join_by_invite(p_code text)
returns table(id uuid,kind text,name text,description text,owner_id uuid,avatar_url text,invite_code text,status text)
language plpgsql security definer set search_path=public
as $$
declare c public.communities%rowtype; existing_role text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول أولًا'; end if;
  select * into c from public.communities where invite_code=lower(trim(p_code)) limit 1;
  if c.id is null then raise exception 'رابط الجروب أو القناة غير صحيح'; end if;
  select role into existing_role from public.community_members where community_id=c.id and user_id=auth.uid();
  if existing_role is not null then return query select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,'joined'::text; return; end if;
  if c.allow_join_requests then
    insert into public.community_join_requests(community_id,user_id,status) values(c.id,auth.uid(),'pending') on conflict do nothing;
    return query select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,'pending'::text;
  else
    insert into public.community_members(community_id,user_id,role) values(c.id,auth.uid(),'member') on conflict do nothing;
    return query select c.id,c.kind,c.name,c.description,c.owner_id,c.avatar_url,c.invite_code,'joined'::text;
  end if;
end;
$$;
grant execute on function public.combo_v25_join_by_invite(text) to authenticated;

create or replace function public.combo_v25_list_join_requests(p_community_id uuid)
returns table(id uuid,user_id uuid,display_name text,username text,avatar_url text,created_at timestamptz)
language sql security definer set search_path=public
as $$
  select r.id,r.user_id,p.display_name,p.username,p.avatar_url,r.created_at
  from public.community_join_requests r left join public.profiles p on p.id=r.user_id
  where r.community_id=p_community_id and r.status='pending'
    and exists(select 1 from public.communities c where c.id=p_community_id and c.owner_id=auth.uid())
  order by r.created_at;
$$;
grant execute on function public.combo_v25_list_join_requests(uuid) to authenticated;

create or replace function public.combo_v25_review_join_request(p_request_id uuid,p_approve boolean)
returns text
language plpgsql security definer set search_path=public
as $$
declare req public.community_join_requests%rowtype;
begin
  select * into req from public.community_join_requests where id=p_request_id and status='pending';
  if req.id is null then raise exception 'طلب الانضمام غير موجود'; end if;
  if not exists(select 1 from public.communities where id=req.community_id and owner_id=auth.uid()) then raise exception 'المالك فقط يستطيع مراجعة الطلبات'; end if;
  if p_approve then
    insert into public.community_members(community_id,user_id,role) values(req.community_id,req.user_id,'member') on conflict do nothing;
    update public.community_join_requests set status='approved',reviewed_at=now() where id=req.id;
    return 'approved';
  else
    update public.community_join_requests set status='rejected',reviewed_at=now() where id=req.id;
    return 'rejected';
  end if;
end;
$$;
grant execute on function public.combo_v25_review_join_request(uuid,boolean) to authenticated;

create or replace function public.combo_v25_add_media(p_community_id uuid,p_media_path text,p_media_mime text)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare mid uuid;
begin
  if not exists(select 1 from public.communities where id=p_community_id and owner_id=auth.uid()) then raise exception 'المالك فقط يستطيع تعديل صورة المجموعة'; end if;
  insert into public.community_media(community_id,user_id,media_path,media_mime) values(p_community_id,auth.uid(),p_media_path,p_media_mime) returning id into mid;
  return mid;
end;
$$;
grant execute on function public.combo_v25_add_media(uuid,text,text) to authenticated;

create or replace function public.combo_v25_list_media(p_community_id uuid)
returns table(id uuid,media_path text,media_mime text,created_at timestamptz)
language sql security definer set search_path=public
as $$
  select id,media_path,media_mime,created_at from public.community_media where community_id=p_community_id order by created_at desc;
$$;
grant execute on function public.combo_v25_list_media(uuid) to authenticated;

select 'ComboApp V25 community management upgrade completed' as status;

create or replace function public.combo_v25_is_admin(p_community_id uuid,p_user_id uuid)
returns boolean language sql security definer set search_path=public
as $$ select exists(select 1 from public.community_members where community_id=p_community_id and user_id=p_user_id and role in ('owner','admin')) or exists(select 1 from public.communities where id=p_community_id and owner_id=p_user_id); $$;
grant execute on function public.combo_v25_is_admin(uuid,uuid) to authenticated;

-- Enforce owner/admin-only posting when the owner enables it.
drop policy if exists community_messages_member_insert on public.community_messages;
create policy community_messages_member_insert on public.community_messages
for insert to authenticated
with check (
  sender_id=auth.uid()
  and (
    public.combo_v25_is_admin(community_id,auth.uid())
    or (
      public.combo_is_community_member(community_id,auth.uid())
      and not exists(select 1 from public.communities c where c.id=community_id and c.admins_only_chat)
    )
    or public.combo_is_community_owner(community_id,auth.uid())
  )
);

create or replace function public.combo_v25_leave_community(p_community_id uuid)
returns text language plpgsql security definer set search_path=public
as $$
declare is_owner boolean;
begin
  select exists(select 1 from public.communities where id=p_community_id and owner_id=auth.uid()) into is_owner;
  if is_owner then
    delete from public.communities where id=p_community_id;
    return 'deleted';
  end if;
  delete from public.community_members where community_id=p_community_id and user_id=auth.uid();
  return 'left';
end;
$$;
grant execute on function public.combo_v25_leave_community(uuid) to authenticated;

create or replace function public.combo_v25_update_community_info(p_community_id uuid,p_name text,p_description text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare allowed boolean;
begin
  select (owner_id=auth.uid() or allow_info_edit) into allowed from public.communities where id=p_community_id;
  if not coalesce(allowed,false) then raise exception 'تغيير معلومات المجموعة غير مسموح'; end if;
  update public.communities set name=left(trim(p_name),100),description=nullif(left(trim(coalesce(p_description,'')),500),''),updated_at=now() where id=p_community_id;
  return true;
end;
$$;
grant execute on function public.combo_v25_update_community_info(uuid,text,text) to authenticated;
