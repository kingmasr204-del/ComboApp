ComboApp V24 FINAL

Fixes:
- Exact username search no longer selects optional username_visibility fields; first-letter search is rejected and full username works.
- Contact profile action buttons use visible inline icons and include "إضافة إلى جروب أو قناة".
- Groups/channels are listed on the home screen and can be opened.
- Group/channel messages can be sent; channel posting is owner-only.
- Invite link can be copied/shared from each group/channel.
- Invite links can be opened to join a group/channel.
- A "جروباتي وقنواتي" item was added to the + menu.

SQL required once:
Run COMBOAPP_COMMUNITIES_V24_UPGRADE.sql in Supabase SQL Editor after the previous communities RLS repair. This adds invite codes and secure invite join functions.
