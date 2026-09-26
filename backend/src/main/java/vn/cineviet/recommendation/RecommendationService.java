package vn.cineviet.recommendation;

import static vn.cineviet.api.ApiModels.*;

import java.time.LocalDate;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.cineviet.catalog.CatalogService;
import vn.cineviet.shared.CustomerIdentity;

@Service
public class RecommendationService {
    private final CatalogService catalog; private final JdbcTemplate jdbc; private final CustomerIdentity identity;
    public RecommendationService(CatalogService catalog, JdbcTemplate jdbc, CustomerIdentity identity) { this.catalog = catalog; this.jdbc = jdbc; this.identity = identity; }

    public List<RecommendationDto> recommend(UUID cinemaId, LocalDate date, List<String> preferred) {
        var showtimes = catalog.showtimes(cinemaId, date).stream().filter(show -> {
            var available = jdbc.queryForObject("select exists(select 1 from showtime_seats where showtime_id=? and status='AVAILABLE')", Boolean.class, show.id());
            return Boolean.TRUE.equals(available);
        }).toList();
        var movies = catalog.movies().stream().filter(movie -> showtimes.stream().anyMatch(show -> show.movieId().equals(movie.id()))).toList();
        var history = jdbc.query("""
            select distinct m.id, m.genres from movies m join showtimes s on s.movie_id=m.id
            join bookings b on b.showtime_id=s.id where b.account_id=? and b.status='CONFIRMED' and b.confirmed_at<clock_timestamp()
            """, (rs, row) -> genres(rs.getArray("genres")), identity.accountId());
        var popularity = new HashMap<UUID, Integer>();
        jdbc.query("""
            select s.movie_id, count(distinct b.account_id)::int as total from bookings b join showtimes s on s.id=b.showtime_id
            where b.status='CONFIRMED' and b.confirmed_at>=clock_timestamp()-interval '30 days' group by s.movie_id
            """, rs -> { popularity.put(rs.getObject("movie_id", UUID.class), rs.getInt("total")); });
        return RecommendationScorer.rank(movies, showtimes, preferred, history, popularity);
    }

    private static List<String> genres(java.sql.Array array) throws SQLException {
        return Arrays.stream((Object[]) array.getArray()).map(Object::toString).toList();
    }
}
