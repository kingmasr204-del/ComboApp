ComboApp V6 - Cloud Data FIXED

IMPORTANT:
Use COMBOAPP_CLOUD_REPAIR.sql in Supabase SQL Editor.
Run it ONCE. It is designed to work with older ComboApp schemas too.

The previous profile media SQL could fail when an older profile_media table
already existed without a user_id column. This version adds missing columns
and backfills ownership from owner_id when that older column exists.

It also aligns user_contacts with the current app, which expects user_id/name/phone.

After SQL returns Success:
1) Upload the contents of the combo folder to your GitHub repository.
2) Replace the old files.
3) Wait for GitHub Pages to publish.
4) Log in and test profile media/settings/contacts.

Do NOT run the old PROFILE_MEDIA_SETUP.sql separately.
