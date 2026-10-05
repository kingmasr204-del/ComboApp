ComboApp V48 — FINAL UX repair

Based on V47.

1) GIF
- GIF search stays inside ComboApp.
- Favorites are local and remain visible even if GIPHY search is temporarily unavailable.
- Searching is explicit via the search icon; opening Favorites does not trigger an online search.
- If GIPHY rate-limits/invalidates the public demo key, a fallback explains the issue and can show bundled GIFs instead of replacing the Favorites view with an error.

2) Community invite links
- Opening a ComboApp community link now shows a WhatsApp-style preview with group/channel image, name, description, and Join / Request to join.
- Join requests respect allow_join_requests.
- Sending a community link inside chat turns it into a clickable ComboApp group preview card.

3) Username privacy
- The V47 strict search behavior remains: username_visibility=nobody/hidden is never returned to search results; contacts-only requires the target phone to exist in the viewer's user_contacts.

4) Normal chat
- Message list always scrolls to the newest message after load/send.
- Composer remains usable with long chats; message area is independently scrollable.
- Swipe a message horizontally to reply.
- Long press/right click opens Reply, Forward, Delete for me, Delete for everyone (own messages), Report (received messages).
- Replies and forwards are encoded in message content so no new database column is required.

5) Stories
- Stories are grouped by person in a two-column WhatsApp-style status grid.
- Tapping a person's card opens a full-screen viewer with progress, automatic advance, tap navigation, and video/audio end advance.
- Own story: views count and viewer list.
- Own story menu: views, repost, delete.
- Friend story menu: download, repost to my story, hide, report.
- Story reply supports text/emoji and image/audio/video attachment.
- Story replies open/create the direct conversation automatically.

No calls were added back.
