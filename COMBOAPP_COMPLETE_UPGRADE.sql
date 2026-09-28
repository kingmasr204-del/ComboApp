-- ComboApp COMPLETE UI/feature upgrade migration
-- Run once in Supabase SQL Editor.

alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.conversation_settings add column if not exists deleted boolean not null default false;
alter table public.call_history add column if not exists duration_seconds integer not null default 0;

-- Profile pictures
insert into storage.buckets(id,name,public) values ('avatars','avatars',true) on conflict(id) do update set public=true;
drop policy if exists combo_avatar_insert on storage.objects;
create policy combo_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists combo_avatar_update on storage.objects;
create policy combo_avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists combo_avatar_delete on storage.objects;
create policy combo_avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists combo_avatar_read on storage.objects;
create policy combo_avatar_read on storage.objects for select to public using(bucket_id='avatars');

-- Delete only this user's view of a conversation (keeps the other user's chat).
-- conversation_settings RLS already covers this table.

-- Call history duration is stored by the caller/receiver when the call ends.

-- Permanent account deletion. This function removes the auth user and cascades
-- profile/conversation settings/call history according to the existing FKs.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- Make the current message update policy support delivered/read ticks.
drop policy if exists messages_member_update on public.messages;
create policy messages_member_update on public.messages for update to authenticated
using (receiver_id=auth.uid() or sender_id=auth.uid())
with check (receiver_id=auth.uid() or sender_id=auth.uid());

-- Reports table for chat reporting
create table if not exists public.reports(
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
drop policy if exists combo_reports_insert on public.reports;
create policy combo_reports_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid());
drop policy if exists combo_reports_read on public.reports;
create policy combo_reports_read on public.reports for select to authenticated using(reporter_id=auth.uid());
