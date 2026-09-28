ComboApp V12
- Removed voice/video calls from the visible app: chat buttons, contact-profile call buttons, calls tab, call settings, and call modal.
- Login flow is guarded against duplicate auth callbacks and opens the app immediately after the profile is ready.
- Secondary data loading is isolated so a missing optional table cannot block opening the app.
- Text message insert uses only core message columns for better schema compatibility.
- Existing SQL files are left untouched; no new SQL is required for this V12 UI/stability update.
