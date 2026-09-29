ComboApp V22 FINAL FIX

Based on V21 CORE BUTTONS FIXED.

Fixes:
- Removed the duplicate enhanceUI/TDZ startup bug that could stop the rest of app.js.
- Startup now runs after all UI functions/patches are loaded.
- Search remains exact full-username search.
- Chat controls are wired: back, send, emoji, attachments, menu, profile header, settings, bell, plus.
- Current user's last_seen is updated immediately and every 30 seconds.
- Contact last-seen lookup works with the current conversations schema.
- Own profile photo opens fullscreen with Delete / Add / Change buttons.
- Multiple profile photos/videos remain supported through profile_media + avatars storage.
- Supplied built-in wallpaper images are visible in the wallpaper picker.
- Gallery image can be used as a chat wallpaper.
- Chat wallpaper is applied directly to the messages area.
- Calls remain removed from the visible UI.

No new SQL file is required by this V22 UI fix if the existing V21 database setup is already in place.
