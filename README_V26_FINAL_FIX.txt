ComboApp V26 — Final UI Fixes

Fixes in this version:
- Privacy & Security page is scrollable and has a working "رجوع" button.
- Username search: partial/prefix search works for visible usernames; hidden usernames are returned only when the full username is entered exactly.
- Exact username search no longer depends on the broader privacy query failing.
- Chat list displays display name, then username as fallback, instead of always showing "مستخدم".
- GIF picker uses absolute GitHub Pages URLs and sent GIF messages resolve to the bundled GIF assets.
- Wallpaper picker now visibly renders color swatches and bundled image thumbnails.
- Bundled wallpaper URLs are resolved against the actual GitHub Pages base URL and are applied to the message area.
- No new SQL is required for these fixes.
