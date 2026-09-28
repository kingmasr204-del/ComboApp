ComboApp update — Contacts, Stories privacy, unread messages, last message, notifications

1) Supabase: run UPGRADE_CONTACTS_AND_CHAT.sql once in SQL Editor.
2) Upload all files from this package to the root of the GitHub ComboApp repository, replacing the old files.
3) The signup screen now has a phone field. Existing users can add their phone from Profile.
4) Press + on Chats to open Contacts. On supported Android browsers, choose contacts. Installed ComboApp users show “دردشة”; others show “دعوة”.
5) Stories are shown in the UI only for your own stories and people in your conversations / imported phone contacts.
6) Chat list shows the last message and unread count.
7) Tap the bell in the top bar to grant browser notification permission. Incoming messages can then show a browser notification while the app is open/active.

Note: true WhatsApp-style background push notifications while the site is fully closed require a push service/backend (for example Firebase Cloud Messaging or OneSignal). This update provides in-app unread counts and browser notifications when the app is running.
