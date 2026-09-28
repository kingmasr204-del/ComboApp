-- ComboApp upgrade: phone contacts + WhatsApp-style chat list/unread counts
-- Run this ONCE in Supabase SQL Editor.

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
  on conflict (id) do update set
    display_name=excluded.display_name,
    username=excluded.username,
    phone=coalesce(excluded.phone,public.profiles.phone);
  return new;
end;
$$;

-- Make sure the trigger uses the updated function.
drop trigger if exists on_auth_user_created_combo on auth.users;
create trigger on_auth_user_created_combo
after insert on auth.users
for each row execute function public.handle_new_user_profile();
