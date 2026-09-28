COMBOAPP V3 FINAL

1) Run COMBOAPP_V3_FINAL.sql once in Supabase SQL Editor.
2) Upload all files from this folder to the root of the GitHub Pages repository and replace existing files.
3) Hard refresh the site after GitHub Pages deploys.

Calls:
- Signaling uses Supabase Realtime broadcast without private-channel authorization requirements.
- ICE gathering is completed before offer/answer is sent to reduce lost candidates.
- Audio uses a dedicated remote audio element.
- Cross-network calls can still require a TURN relay on restrictive mobile/NAT networks; STUN alone cannot guarantee connectivity on every carrier.

The profile, privacy, wallpaper, theme, bubble and tick controls are functional and persisted locally / in the profiles table where supported.
