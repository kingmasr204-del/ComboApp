-- ComboApp: Stories with images, videos and audio + friends-only visibility.
-- Run once in Supabase SQL Editor.

alter table public.stories add column if not exists media_path text;
alter table public.stories add column if not exists media_type text not null default 'text';

-- Keep stories visible only to the owner and people who are connected to the owner
-- through a conversation (the app's current friend/contact relationship).
drop policy if exists stories_auth_read on public.stories;
create policy stories_auth_read on public.stories
for select to authenticated
using (
  expires_at > now()
  and (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where (c.user1_id = stories.user_id and c.user2_id = auth.uid())
         or (c.user2_id = stories.user_id and c.user1_id = auth.uid())
    )
  )
);

-- Private Storage bucket for story media.
insert into storage.buckets (id, name, public)
values ('stories', 'stories', false)
on conflict (id) do update set public=false;

drop policy if exists stories_media_insert on storage.objects;
create policy stories_media_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists stories_media_read on storage.objects;
create policy stories_media_read on storage.objects
for select to authenticated
using (
  bucket_id = 'stories'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.stories s
      join public.conversations c
        on ((c.user1_id = s.user_id and c.user2_id = auth.uid())
         or (c.user2_id = s.user_id and c.user1_id = auth.uid()))
      where s.media_path = name and s.expires_at > now()
    )
  )
);

drop policy if exists stories_media_delete on storage.objects;
create policy stories_media_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional cleanup helper: old media files are not automatically removed by this
-- SQL. The app stops showing expired stories after 24h; storage cleanup can be
-- automated later with a scheduled Edge Function.
