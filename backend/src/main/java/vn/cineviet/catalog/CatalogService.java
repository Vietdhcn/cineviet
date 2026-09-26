package vn.cineviet.catalog;

import static vn.cineviet.api.ApiModels.*;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.cineviet.shared.ApiExceptionHandler.DomainException;

@Service
public class CatalogService {
    private final JdbcTemplate jdbc;
    public CatalogService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<MovieDto> movies() {
        return jdbc.query("""
            select id, slug, title, tagline, synopsis, genres, duration_minutes, age_rating, origin,
                   extract(year from release_date)::int as year, palette, artwork_label, featured
            from movies where visibility = 'PUBLISHED' order by featured desc, title
            """, (rs, row) -> new MovieDto(
                rs.getObject("id", UUID.class), rs.getString("slug"), rs.getString("title"), rs.getString("tagline"), rs.getString("synopsis"),
                textArray(rs.getArray("genres")), rs.getInt("duration_minutes"), rs.getString("age_rating"), rs.getString("origin"), rs.getInt("year"),
                textArray(rs.getArray("palette")), rs.getString("artwork_label"), rs.getBoolean("featured")));
    }

    public List<CinemaDto> cinemas() {
        return jdbc.query("select id, name, address, city from cinemas where active order by city, name", (rs, row) -> new CinemaDto(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("address"), rs.getString("city")));
    }

    public List<ShowtimeDto> showtimes(UUID cinemaId, LocalDate date) {
        var sql = new StringBuilder("""
            select s.id, s.movie_id, s.cinema_id, s.starts_at, s.room_name, s.format, s.base_price
            from showtimes s join movies m on m.id=s.movie_id
            where m.visibility='PUBLISHED' and s.starts_at > clock_timestamp()
            """);
        var args = new java.util.ArrayList<>();
        if (cinemaId != null) { sql.append(" and s.cinema_id = ?"); args.add(cinemaId); }
        if (date != null) { sql.append(" and (s.starts_at at time zone 'Asia/Ho_Chi_Minh')::date = ?"); args.add(date); }
        sql.append(" order by s.starts_at, s.id");
        return jdbc.query(sql.toString(), (rs, row) -> new ShowtimeDto(rs.getObject("id", UUID.class), rs.getObject("movie_id", UUID.class), rs.getObject("cinema_id", UUID.class), rs.getTimestamp("starts_at").toInstant(), rs.getString("room_name"), rs.getString("format"), rs.getBigDecimal("base_price")), args.toArray());
    }

    public ShowtimeDto showtime(UUID id) {
        var rows = jdbc.query("""
            select s.id, s.movie_id, s.cinema_id, s.starts_at, s.room_name, s.format, s.base_price
            from showtimes s where s.id=?
            """, (rs, row) -> new ShowtimeDto(rs.getObject("id", UUID.class), rs.getObject("movie_id", UUID.class), rs.getObject("cinema_id", UUID.class), rs.getTimestamp("starts_at").toInstant(), rs.getString("room_name"), rs.getString("format"), rs.getBigDecimal("base_price")), id);
        if (rows.isEmpty()) throw new DomainException(HttpStatus.NOT_FOUND, "SHOWTIME_NOT_FOUND", "Suất chiếu không tồn tại.");
        return rows.getFirst();
    }

    public List<SeatDto> seats(UUID showtimeId) {
        return jdbc.query("""
            select ss.seat_id, se.row_label, se.seat_number, se.kind, ss.status, ss.price
            from showtime_seats ss join seats se on se.id=ss.seat_id
            where ss.showtime_id=? order by se.row_label, se.seat_number
            """, (rs, row) -> new SeatDto(rs.getObject("seat_id", UUID.class).toString(), rs.getString("row_label"), rs.getInt("seat_number"), rs.getString("kind"), rs.getString("status"), rs.getBigDecimal("price")), showtimeId);
    }

    private static List<String> textArray(Array sqlArray) throws SQLException {
        if (sqlArray == null) return List.of();
        return Arrays.stream((Object[]) sqlArray.getArray()).map(Object::toString).toList();
    }
}
