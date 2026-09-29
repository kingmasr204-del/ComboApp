ComboApp V23 - Username Search Fix

- Prefix search starts from the first character.
- Public usernames appear in prefix results.
- Hidden (nobody) usernames never appear.
- Contacts-only usernames appear in prefix search only to contacts.
- A full exact username can resolve directly, including contacts-only visibility, per the requested behavior.
- Search no longer depends on a fixed profiles column list, reducing "تعذر البحث حاليًا" errors from schema differences.
