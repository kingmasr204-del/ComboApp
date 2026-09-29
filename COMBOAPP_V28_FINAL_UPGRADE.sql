-- ComboApp V28: message actions, community links/members, per-contact privacy
alter table public.messages add column if not exists deleted_for_everyone boolean not null default false;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_for_everyone_at timestamptz;

create table if not exists public.message_user_deletions(
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
alter table public.message_user_deletions enable row level security;
drop policy if exists combo_msg_del_select on public.message_user_deletions;
create policy combo_msg_del_select on public.message_user_deletions for select to authenticated using(user_id=auth.uid());
drop policy if exists combo_msg_del_insert on public.message_user_deletions;
create policy combo_msg_del_insert on public.message_user_deletions for insert to authenticated with check(user_id=auth.uid());

drop function if exists public.combo_v28_delete_message_everyone(uuid);
create or replace function public.combo_v28_delete_message_everyone(p_message_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.messages where id=p_message_id and sender_id=auth.uid()) then raise exception 'لا يمكنك حذف هذه الرسالة للجميع'; end if;
  update public.messages set content='تم حذف هذه الرسالة',deleted_for_everyone=true,deleted_for_everyone_at=now() where id=p_message_id;
  return true;
end;$$;
grant execute on function public.combo_v28_delete_message_everyone(uuid) to authenticated;

alter table public.communities add column if not exists invite_code text;
create unique index if not exists communities_invite_code_uidx on public.communities(invite_code) where invite_code is not null;

create or replace function public.combo_v28_ensure_invite(p_community_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare c text; is_owner boolean;
begin
  select owner_id=auth.uid(),invite_code into is_owner,c from public.communities where id=p_community_id;
  if not is_owner then raise exception 'المالك فقط يستطيع إنشاء رابط الدعوة'; end if;
  if c is null or c='' then
    c=lower(substr(replace(gen_random_uuid()::text,'-',''),1,12));
    update public.communities set invite_code=c,updated_at=now() where id=p_community_id;
  end if;
  return c;
end;$$;
grant execute on function public.combo_v28_ensure_invite(uuid) to authenticated;

create or replace function public.combo_v28_add_member(p_community_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.communities where id=p_community_id and owner_id=auth.uid()) then raise exception 'المالك فقط يستطيع إضافة الأعضاء'; end if;
  insert into public.community_members(community_id,user_id,role) values(p_community_id,p_user_id,'member') on conflict do nothing;
  return true;
end;$$;
grant execute on function public.combo_v28_add_member(uuid,uuid) to authenticated;

create table if not exists public.contact_privacy_settings(
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references auth.users(id) on delete cascade,
  can_view_profile boolean not null default true,
  can_view_photo boolean not null default true,
  can_view_about boolean not null default true,
  can_message boolean not null default true,
  can_call boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(owner_id,contact_id)
);
alter table public.contact_privacy_settings enable row level security;
drop policy if exists combo_cps_select on public.contact_privacy_settings;
create policy combo_cps_select on public.contact_privacy_settings for select to authenticated using(owner_id=auth.uid());
drop policy if exists combo_cps_insert on public.contact_privacy_settings;
create policy combo_cps_insert on public.contact_privacy_settings for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists combo_cps_update on public.contact_privacy_settings;
create policy combo_cps_update on public.contact_privacy_settings for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

