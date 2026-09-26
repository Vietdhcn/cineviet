-- Incrementing this value revokes every previously issued customer session.
alter table accounts add column session_version integer not null default 0 check (session_version >= 0);
