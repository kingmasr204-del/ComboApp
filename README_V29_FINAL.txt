ComboApp V29 FINAL

Based on V28. This patch focuses on the final test pass:
- Notification bell now toggles ON/OFF using the same cloud/local setting key and shows 🔔/🔕.
- Username search: public usernames appear by prefix; contacts-only usernames appear only to matching contacts; hidden/nobody usernames are not exposed by search. Phone-number lookup is supported.
- Chat list prefers the saved contact name, then display name/username, instead of "مستخدم".
- Contact profile: media/links/files, in-chat search, privacy controls, report, fullscreen profile image, add contact, and add-to-group/channel.
- Add-to-group/channel picker includes contacts, recent chats, and all ComboApp users.
- Community chat is WhatsApp-like: title opens profile; composer has emoji, GIF, attachments, and normal send. Media/files are allowed for members unless admins-only chat is enabled.
- Community profile includes unique invite link, copy/share, add members, media gallery, report, member moderation, settings, join requests, leave/delete, and owner photo update.
- Normal messages support edit, delete for me, delete for everyone (shows "تم حذف هذه الرسالة"), and report only for messages from the other user.
- Ten newly uploaded wallpapers were added as wall_11.jpg ... wall_20.jpg and are shown as image previews.

SQL: COMBOAPP_V29_FINAL_UPGRADE.sql is idempotent and can be run once in Supabase SQL Editor after V28.
