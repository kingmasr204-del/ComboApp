ComboApp V33 Repair

Fixes:
- Profile save no longer fails when the existing Supabase schema lacks profiles.phone; it retries supported fields.
- Username search is open to everyone and supports partial/contains search without requiring the full username.
- Group profile opens directly from the group name/photo.
- Group invite link is generated/displayed and can be copied/shared.
- Owner can add members, promote/demote admins, kick members, edit name/bio, change/delete group photo, review join requests, delete/leave, and configure who can send messages and who can edit group info.
- COMBOAPP_V33_REPAIR.sql adds the missing phone column and repairs the community info permissions/storage.
