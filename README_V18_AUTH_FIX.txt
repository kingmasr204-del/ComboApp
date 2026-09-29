ComboApp V18 — Auth button/CDN resilience
- Added synchronous Supabase CDN fallback (jsDelivr -> unpkg) so auth UI does not become dead if the primary CDN fails.
- Added a guard in init() with a clear message if Supabase is unavailable.
- Preserves V17 cloud groups/channels implementation.
- No new SQL.
