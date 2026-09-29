ComboApp V17 - Cloud Groups & Channels

This version makes group/channel creation persistent in Supabase instead of localStorage only.
Run COMBOAPP_COMMUNITIES_SETUP.sql once in Supabase SQL Editor, then upload the combo folder.

Tables:
- communities: group/channel profile data
- community_members: owners/members
- community_messages: future group/channel messages

No secret key is used.
