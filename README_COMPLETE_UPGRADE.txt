ComboApp complete UI upgrade

1) Run COMBOAPP_COMPLETE_UPGRADE.sql in Supabase SQL Editor.
2) Upload all files inside combo/ to the root of your GitHub Pages repository.
3) Keep STORIES_MEDIA_SETUP.sql already applied for story media.
4) Reload https://kingmasr204-del.github.io/ComboApp/

Notes:
- Browser contact access is not supported by every Android browser. The Contacts screen therefore has a manual number fallback.
- Real background push notifications and production-grade WebRTC TURN require additional infrastructure; this build includes in-page/browser notifications and WebRTC signaling with public STUN servers.
- GIF tab UI is included; a real Tenor/GIPHY feed requires an API key.
