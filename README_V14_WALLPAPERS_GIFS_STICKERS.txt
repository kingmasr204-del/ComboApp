ComboApp V14
- Added the 10 user-provided images as chat wallpaper choices.
- Added custom wallpaper picker from the device gallery; the selected image is compressed and saved locally on that device/browser.
- Added 20 local GIF choices in the GIF tab.
- Added themed sticker packs including cups and teddy bears, plus import-from-device/app sticker images.
- Imported sticker images are stored locally and can be sent as chat media through the existing chat-media storage bucket.
- Fixed chat profile taps: clicking the person/avatar/name in the chat header opens the contact profile; clicking the avatar/name in the chat list opens the contact profile without opening the chat.
- No new SQL is required for these UI features. Sticker sending uses the existing chat-media storage bucket.
