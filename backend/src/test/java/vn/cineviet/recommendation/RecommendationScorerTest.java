package vn.cineviet.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.cineviet.api.ApiModels.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RecommendationScorerTest {
    @Test
    void ordersHandCalculatedExampleAThenCThenB() {
        var cinema = UUID.randomUUID(); var start = Instant.parse("2026-09-24T11:00:00Z");
        var a = movie("A", List.of("Hành động")); var b = movie("B", List.of("Hài")); var c = movie("C", List.of("Hành động", "Hài"));
        var shows = List.of(show(a.id(), cinema, start), show(b.id(), cinema, start), show(c.id(), cinema, start));
        var ranked = RecommendationScorer.rank(List.of(a, b, c), shows, List.of("Hành động"), List.of(), Map.of());
        assertThat(ranked).extracting(item -> item.movie().title()).containsExactly("A", "C", "B");
    }

    @Test
    void averagesDistinctHistoryMovieVectorsBeforeBlendingPreferences() {
        var cinema = UUID.randomUUID(); var start = Instant.parse("2026-09-25T11:00:00Z");
        var a = movie("A", List.of("Hành động")); var b = movie("B", List.of("Hài"));
        var ranked = RecommendationScorer.rank(List.of(a, b), List.of(show(a.id(), cinema, start), show(b.id(), cinema, start)),
            List.of("Hành động"), List.of(List.of("Hành động", "Hài"), List.of("Hài")), Map.of());
        assertThat(ranked).extracting(item -> item.movie().title()).containsExactly("A", "B");
        assertThat(ranked.getFirst().score()).isCloseTo(.8 * .75 / Math.sqrt(.75 * .75 + .5 * .5), org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void coldStartUsesPopularityAndBreaksTiesByEarliestShowtime() {
        var cinema = UUID.randomUUID(); var start = Instant.parse("2026-09-25T11:00:00Z");
        var a = movie("A", List.of("Hành động")); var b = movie("B", List.of("Hài")); var c = movie("C", List.of("Tâm lý"));
        var ranked = RecommendationScorer.rank(List.of(a, b, c),
            List.of(show(a.id(), cinema, start.plusSeconds(7200)), show(b.id(), cinema, start), show(c.id(), cinema, start.plusSeconds(3600))),
            List.of(), List.of(), Map.of(a.id(), 5, b.id(), 5, c.id(), 1));
        assertThat(ranked).extracting(item -> item.movie().title()).containsExactly("B", "A", "C");
        assertThat(ranked.getFirst().reasons()).doesNotContain("PREFERRED_GENRE");
    }

    @Test
    void returnsEmptyWithoutAvailableShowtimes() {
        assertThat(RecommendationScorer.rank(List.of(movie("A", List.of("Hài"))), List.of(), List.of(), List.of(), Map.of())).isEmpty();
    }

    private MovieDto movie(String title, List<String> genres) { return new MovieDto(UUID.randomUUID(), title.toLowerCase(), title, "", "", genres, 90, "P", "Việt Nam", 2026, List.of("#000", "#111", "#fff"), "demo", false); }
    private ShowtimeDto show(UUID movieId, UUID cinemaId, Instant startsAt) { return new ShowtimeDto(UUID.randomUUID(), movieId, cinemaId, startsAt, "01", "2D", BigDecimal.valueOf(80_000)); }
}
