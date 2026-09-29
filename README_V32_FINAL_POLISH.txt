ComboApp V32 FINAL POLISH

Base: V31 (V29 community implementation preserved)

V32 fixes:
- Reliable 20-image chat wallpaper picker using resolved GitHub Pages URLs.
- Story composer background now matches the text area; color row is moved above tools.
- Community/group chat keeps only emoji, GIF, attachment and send controls.
- Community header opens a working group/channel profile with invite link, members, media, report, settings, requests and owner controls.
- Community profile image can be added/changed/removed.
- Profile media viewer supports multiple photos/videos with carousel and deletion.
- Profile save uses upsert and returns the saved row for clearer failures.
- Notification bell is a single true on/off toggle.
- Message actions use an in-app edit field; own messages can be edited/deleted for me/deleted for everyone, incoming messages can be deleted for me or reported.

No new SQL is required by this V32 patch beyond the existing V29/V25/V5 schema already included in the project.
