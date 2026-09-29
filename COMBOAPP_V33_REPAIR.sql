-- ComboApp V33 repair: run once in Supabase SQL Editor.
-- Fixes the missing profiles.phone error and completes WhatsApp-style group controls.

alter table public.profiles add column if not exists phone text;
create unique index if not exists profiles_phone_uidx on public.profiles(phone) where phone is not null and phone <> '';

alter table public.communities add column if not exists invite_code text;
alter table public.communities add column if not exists allow_info_edit boolean not null default true;
alter table public.communities add column if not exists admins_only_chat boolean not null default false;
alter table public.communities add column if not exists allow_join_requests boolean not null default false;
update public.communities set invite_code=lower(substr(replace(gen_random_uuid()::text,'-',''),1,12)) where invite_code is null or invite_code='';
create unique index if not exists communities_invite_code_uidx on public.communities(invite_code) where invite_code is not null;

-- Let owners OR admins edit group information when the setting is admins-only.
create or replace function public.combo_v25_update_community_info(p_community_id uuid,p_name text,p_description text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(
    select 1 from public.communities c
    where c.id=p_community_id
      and (
        c.owner_id=auth.uid()
        or (c.allow_info_edit=true and public.combo_is_community_member(p_community_id,auth.uid()))
        or exists(select 1 from public.community_members m where m.community_id=p_community_id and m.user_id=auth.uid() and m.role='admin')
      )
  ) then raise exception 'تغيير معلومات المجموعة غير مسموح'; end if;
  update public.communities set name=left(trim(p_name),100),description=nullif(left(trim(coalesce(p_description,'')),500),''),updated_at=now() where id=p_community_id;
  return true;
end;$$;
grant execute on function public.combo_v25_update_community_info(uuid,text,text) to authenticated;

-- Storage bucket used by group pictures/media.
insert into storage.buckets(id,name,public) values('community-media','community-media',true)
on conflict(id) do update set public=true;
drop policy if exists combo_v33_community_storage_insert on storage.objects;
create policy combo_v33_community_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists combo_v33_community_storage_read on storage.objects;
create policy combo_v33_community_storage_read on storage.objects for select to public using(bucket_id='community-media');

