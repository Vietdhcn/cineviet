-- Flyway V1/V2 are immutable on databases that have already run them. Remove
-- only fictional seed rows with no booking or occupied-seat references.
-- Historical orders, payments, tickets and the rows they reference remain.

delete from showtime_seats ss
using showtimes s join movies m on m.id = s.movie_id
where ss.showtime_id = s.id
  and m.source_key like 'demo-%'
  and not exists (select 1 from bookings b where b.showtime_id = s.id)
  and not exists (
    select 1 from showtime_seats occupied
    where occupied.showtime_id = s.id and occupied.status <> 'AVAILABLE'
  );

delete from showtimes s
using movies m
where s.movie_id = m.id
  and m.source_key like 'demo-%'
  and not exists (select 1 from bookings b where b.showtime_id = s.id)
  and not exists (select 1 from showtime_seats ss where ss.showtime_id = s.id);

delete from seats se
where se.cinema_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
)
  and not exists (select 1 from booking_items bi where bi.seat_id = se.id)
  and not exists (select 1 from showtime_seats ss where ss.seat_id = se.id)
  and not exists (select 1 from showtimes s where s.cinema_id = se.cinema_id);

delete from cinemas c
where c.id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
)
  and not exists (select 1 from showtimes s where s.cinema_id = c.id)
  and not exists (select 1 from seats se where se.cinema_id = c.id);

delete from movies m
where m.source_key like 'demo-%'
  and not exists (select 1 from showtimes s where s.movie_id = m.id);

delete from accounts a
where a.password_hash in ('DEMO-NOT-A-REAL-PASSWORD', 'SESSION-DEMO-NO-PASSWORD')
  and not exists (select 1 from bookings b where b.account_id = a.id)
  and not exists (select 1 from idempotency_records i where i.account_id = a.id);
