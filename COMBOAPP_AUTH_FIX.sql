-- ComboApp V19 AUTH FIX
-- Run this ONCE in Supabase SQL Editor for the existing profiles table.
-- These policies are required because the app creates/updates a profile after Auth login.
-- RLS stays enabled.

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated, anon
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated, anon
using (auth.uid() = id)
with check (auth.uid() = id);

-- Optional: if you want anonymous/guest login, enable Anonymous Sign-Ins in
-- Supabase Dashboard -> Authentication -> Providers/Sign In methods.
-- The app's "دخول كزائر" button uses supabase.auth.signInAnonymously().
