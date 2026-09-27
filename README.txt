ComboApp — FINAL BUILD

IMPORTANT BEFORE PUBLISHING
1. Run supabase.sql in the Supabase SQL Editor.
2. Supabase Auth > Providers > Email: enable Confirm email.
3. Supabase Auth > URL Configuration: set Site URL to your final HTTPS app URL. Add the same URL to Redirect URLs.
4. For "ComboApp" instead of "Supabase" as the email sender, configure a custom SMTP provider (for example Resend, SendGrid, Mailgun) in Supabase. Use the HTML templates in email-templates.txt. Never put SMTP secrets in the frontend.
5. The password reset error in the screenshot is caused by opening 127.0.0.1:5500 on the phone. 127.0.0.1 means the phone itself. For local testing, use the PC LAN IP (same Wi‑Fi) or deploy the app over HTTPS. For the store, use the deployed HTTPS URL.
6. The old signup "created but could not save" issue is fixed by a database trigger that creates the profile automatically after auth signup.
7. Voice/video calls use WebRTC + Supabase Realtime signaling. They need HTTPS and browser camera/microphone permission. STUN is included; a TURN server should be added for users behind restrictive NAT/firewalls before a large public launch.
8. Keep the publishable Supabase key in the frontend only; never put a Supabase service-role/secret key in these files.
9. The included logo.svg/logo.png/manifest.webmanifest replace the old C+three-dots icon with a crown + C/chat identity.
