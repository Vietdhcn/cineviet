package vn.cineviet.catalog;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Keeps a small, fictional catalogue bookable without changing real bookings or sold seats. */
@Service
public class DemoScheduleService {
    private final JdbcTemplate jdbc;
    public DemoScheduleService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Scheduled(initialDelay = 0, fixedDelay = 3_600_000)
    @Transactional
    public void maintain() {
        jdbc.update("""
            with templates(movie_id, cinema_id, room_name, local_time, format, base_price) as (
              values
              ('20000000-0000-0000-0000-000000000001'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Lacquer 01','19:15'::time,'2D',85000),
              ('20000000-0000-0000-0000-000000000004'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Lacquer 01','10:00'::time,'3D',95000),
              ('20000000-0000-0000-0000-000000000002'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Cobalt 02','20:10'::time,'2D',90000),
              ('20000000-0000-0000-0000-000000000005'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Cobalt 02','15:00'::time,'2D',90000),
              ('20000000-0000-0000-0000-000000000003'::uuid,'10000000-0000-0000-0000-000000000002'::uuid,'Lacquer 01','17:40'::time,'2D',80000),
              ('20000000-0000-0000-0000-000000000001'::uuid,'10000000-0000-0000-0000-000000000002'::uuid,'Lacquer 01','20:00'::time,'2D',90000),
              ('20000000-0000-0000-0000-000000000002'::uuid,'10000000-0000-0000-0000-000000000002'::uuid,'Cobalt 02','13:00'::time,'3D',110000),
              ('20000000-0000-0000-0000-000000000004'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Lacquer 01','18:10'::time,'2D',70000),
              ('20000000-0000-0000-0000-000000000003'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Lacquer 01','10:00'::time,'2D',70000),
              ('20000000-0000-0000-0000-000000000005'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Cobalt 02','20:40'::time,'2D',80000),
              ('20000000-0000-0000-0000-000000000006'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Lacquer 01','14:00'::time,'2D',85000),
              ('20000000-0000-0000-0000-000000000007'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Cobalt 02','10:00'::time,'2D',85000),
              ('20000000-0000-0000-0000-000000000008'::uuid,'10000000-0000-0000-0000-000000000002'::uuid,'Lacquer 01','11:00'::time,'2D',75000),
              ('20000000-0000-0000-0000-000000000009'::uuid,'10000000-0000-0000-0000-000000000002'::uuid,'Cobalt 02','18:00'::time,'2D',90000),
              ('20000000-0000-0000-0000-000000000010'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Lacquer 01','14:00'::time,'2D',70000),
              ('20000000-0000-0000-0000-000000000011'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Cobalt 02','10:00'::time,'2D',75000),
              ('20000000-0000-0000-0000-000000000012'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Cobalt 02','14:00'::time,'2D',80000)
            ), dates as (
              select ((clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date + n) as local_day from generate_series(0,7) n
            )
            insert into showtimes(id,movie_id,cinema_id,starts_at,room_name,format,base_price)
            select md5(t.movie_id::text || t.cinema_id::text || t.room_name || d.local_day::text || t.local_time::text)::uuid,
                   t.movie_id,t.cinema_id,(d.local_day + t.local_time) at time zone 'Asia/Ho_Chi_Minh',t.room_name,t.format,t.base_price
            from templates t cross join dates d
            where (d.local_day + t.local_time) at time zone 'Asia/Ho_Chi_Minh' > clock_timestamp() + interval '10 minutes'
            on conflict(id) do nothing
            """);
        jdbc.update("""
            insert into showtime_seats(showtime_id,seat_id,status,price)
            select sh.id,se.id,'AVAILABLE',sh.base_price + case when se.kind='VIP' then 25000 else 0 end
            from showtimes sh join seats se on se.cinema_id=sh.cinema_id and se.room_name=sh.room_name
            where sh.starts_at>clock_timestamp() and not exists(select 1 from showtime_seats ss where ss.showtime_id=sh.id)
            on conflict(showtime_id,seat_id) do nothing
            """);
    }
}
