ComboApp V22 — final polish
- Fixed profile saving with duplicate username/phone checks and upsert fallback.
- Added 9 newly uploaded wallpaper images (wall_11.jpg ... wall_19.jpg).
- Fixed wallpaper picker/application paths.
- Fixed notification bell as a true on/off toggle with 🔔/🔕 state.
- Chat list/header uses display name, then username/phone, instead of generic "مستخدم".
- Added tap/long-press message actions: edit, delete for me, delete for everyone, report.
- Replaced browser prompt-style message editing with an in-app composer.
- Added Play Store discovery button for sticker apps.
- No new SQL is required for these UI fixes; delete-for-me is stored locally, delete-for-everyone uses existing message update permissions.
