-- Keep historical bookings and their foreign keys intact. Only withdraw the
-- identified fictional catalogue and venues from public discovery.
update movies set visibility = 'HIDDEN'
where source_key like 'demo-%' and visibility = 'PUBLISHED';

update cinemas set active = false
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);
