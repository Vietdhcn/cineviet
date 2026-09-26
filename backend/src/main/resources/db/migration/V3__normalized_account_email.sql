-- Keep login identity unique even when old/imported rows use different case.
create unique index accounts_email_normalized_unique on accounts (lower(email));
