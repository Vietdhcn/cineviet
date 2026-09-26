package vn.cineviet.recommendation;

import static vn.cineviet.api.ApiModels.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public final class RecommendationScorer {
    private RecommendationScorer() {}

    public static List<RecommendationDto> rank(List<MovieDto> movies, List<ShowtimeDto> showtimes, List<String> preferred, List<List<String>> historyMovies, Map<java.util.UUID, Integer> popularity) {
        var genres = List.of("Hành động", "Hài", "Tình cảm", "Hoạt hình", "Phiêu lưu", "Tâm lý");
        var preferenceVector = vector(genres, preferred);
        var historyVector = new double[genres.size()];
        for (var history : historyMovies) {
            var movieVector = vector(genres, history);
            for (var index = 0; index < historyVector.length; index++) historyVector[index] += movieVector[index] / historyMovies.size();
        }
        var hasPreference = hasSignal(preferenceVector); var hasHistory = hasSignal(historyVector);
        var profile = new double[genres.size()];
        for (var index = 0; index < profile.length; index++) profile[index] = hasPreference && hasHistory ? (preferenceVector[index] + historyVector[index]) / 2 : hasPreference ? preferenceVector[index] : historyVector[index];
        var maxPopularity = popularity.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        var ranked = new ArrayList<RecommendationDto>();
        for (var movie : movies) {
            var earliest = showtimes.stream().filter(show -> show.movieId().equals(movie.id())).map(ShowtimeDto::startsAt).min(Instant::compareTo).orElse(null);
            if (earliest == null) continue;
            var similarity = cosine(profile, vector(genres, movie.genres()));
            var count = popularity.getOrDefault(movie.id(), 0);
            var pop = maxPopularity == 0 ? 0 : Math.log1p(count) / Math.log1p(maxPopularity);
            var score = hasPreference || hasHistory ? .8 * similarity + .2 * pop : pop;
            var reasons = new ArrayList<String>();
            if (movie.genres().stream().anyMatch(preferred::contains)) reasons.add("PREFERRED_GENRE");
            if (movie.genres().stream().anyMatch(genre -> historyMovies.stream().anyMatch(history -> history.contains(genre)))) reasons.add("HISTORY_GENRE");
            if (pop > .5) reasons.add("POPULAR");
            reasons.add("AVAILABLE_SHOWTIME");
            ranked.add(new RecommendationDto(movie, score, reasons, earliest));
        }
        return ranked.stream().sorted(Comparator.comparingDouble(RecommendationDto::score).reversed().thenComparing(RecommendationDto::earliestShowtime).thenComparing(item -> item.movie().id())).limit(10).toList();
    }

    private static double[] vector(List<String> dictionary, List<String> values) { return dictionary.stream().mapToDouble(value -> values.contains(value) ? 1.0 : 0.0).toArray(); }
    private static boolean hasSignal(double[] values) { for (var value : values) if (value > 0) return true; return false; }
    private static double cosine(double[] left, double[] right) {
        double dot = 0, a = 0, b = 0;
        for (var index = 0; index < left.length; index++) { dot += left[index] * right[index]; a += left[index] * left[index]; b += right[index] * right[index]; }
        return a == 0 || b == 0 ? 0 : dot / (Math.sqrt(a) * Math.sqrt(b));
    }
}
