ComboApp V23 FINAL FIX

1) Main app fix:
- Fixed the global `setting()` / `setSetting()` scope bug that could throw "setting is not defined".
- This bug could stop the initial bind() function, leaving Stories, Sarhny, notifications, profile buttons, chat controls, etc. unresponsive.
- Added a defensive guard around notification initialization so one UI error cannot stop the rest of the bindings.

2) Groups / channels:
- The screenshot error "infinite recursion detected in policy for relation communities" is caused by mutually-recursive Supabase RLS policies.
- Run COMBOAPP_COMMUNITIES_RLS_REPAIR.sql ONCE in Supabase SQL Editor.
- After that, create group/channel again.

3) Profile media:
- Existing unlimited profile photo/video implementation remains.
- PROFILE_MEDIA_SETUP.sql / the V6 cloud setup is required for cross-device profile media persistence; same-device fallback remains.

No new frontend key or password is required.
