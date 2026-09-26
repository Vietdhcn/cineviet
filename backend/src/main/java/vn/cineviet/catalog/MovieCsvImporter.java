package vn.cineviet.catalog;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Offline catalogue import. This is deliberately not exposed as an unauthenticated HTTP endpoint. */
@Service
public class MovieCsvImporter {
    private static final List<String> HEADER = List.of(
        "sourceKey", "title", "genres", "durationMinutes", "releaseDate", "ageRating",
        "sourceUrl", "fetchedAt", "verifiedAt", "origin", "visibility", "posterPath", "rightsNote",
        "country", "slug", "tagline", "synopsis", "palette", "artworkLabel", "featured");
    private final JdbcTemplate jdbc;

    public MovieCsvImporter(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record MovieRow(int line, String sourceKey, String title, String[] genres, int durationMinutes,
                           LocalDate releaseDate, String ageRating, String sourceUrl, Instant fetchedAt,
                           Instant verifiedAt, String origin, String visibility, String posterPath,
                           String rightsNote, String country, String slug, String tagline, String synopsis, String[] palette,
                           String artworkLabel, boolean featured) { }
    public record ImportReport(int total, int created, int updated, boolean applied) { }

    public List<MovieRow> parse(Path path) throws IOException {
        var records = splitCsv(Files.readString(path, StandardCharsets.UTF_8));
        if (records.isEmpty() || !records.getFirst().equals(HEADER)) {
            throw new IllegalArgumentException("CSV header không khớp mẫu import phim.");
        }
        var result = new ArrayList<MovieRow>();
        var seenKeys = new HashSet<String>();
        var seenSlugs = new HashSet<String>();
        for (int index = 1; index < records.size(); index++) {
            var cells = records.get(index);
            if (cells.size() == 1 && cells.getFirst().isBlank()) continue;
            int line = index + 1;
            if (cells.size() != HEADER.size()) throw new IllegalArgumentException("Dòng " + line + ": sai số cột.");
            try {
                var sourceKey = required(cells, 0);
                var slug = required(cells, 14);
                if (!sourceKey.matches("[a-z0-9][a-z0-9-]{2,119}") || !slug.matches("[a-z0-9][a-z0-9-]{2,119}"))
                    throw new IllegalArgumentException("sourceKey/slug phải là mã chữ thường, số hoặc dấu gạch nối.");
                if (!seenKeys.add(sourceKey) || !seenSlugs.add(slug))
                    throw new IllegalArgumentException("sourceKey hoặc slug bị lặp trong CSV.");
                var genres = parts(required(cells, 2));
                var palette = parts(required(cells, 17));
                if (genres.length == 0 || palette.length != 3 || Arrays.stream(palette).anyMatch(color -> !color.matches("#[0-9A-Fa-f]{6}")))
                    throw new IllegalArgumentException("genres hoặc palette không hợp lệ.");
                int duration = Integer.parseInt(required(cells, 3));
                if (duration < 1 || duration > 600) throw new IllegalArgumentException("durationMinutes phải từ 1 đến 600.");
                var origin = required(cells, 9);
                var visibility = required(cells, 10);
                if (!Set.of("SYNTHETIC", "BETA_REFERENCE").contains(origin) || !Set.of("DRAFT", "PUBLISHED").contains(visibility))
                    throw new IllegalArgumentException("origin hoặc visibility không hợp lệ.");
                if (origin.equals("BETA_REFERENCE") && visibility.equals("PUBLISHED"))
                    throw new IllegalArgumentException("Dữ liệu tham khảo Beta không được tự công bố.");
                var rights = required(cells, 12);
                if (origin.equals("SYNTHETIC") && !rights.toLowerCase(java.util.Locale.ROOT).contains("demo"))
                    throw new IllegalArgumentException("Phim hư cấu phải có ghi chú quyền DEMO.");
                var sourceUrl = optional(cells, 6);
                if (origin.equals("BETA_REFERENCE") && (sourceUrl == null || optional(cells, 7) == null))
                    throw new IllegalArgumentException("Dữ liệu tham khảo phải có nguồn và thời gian truy cập.");
                result.add(new MovieRow(line, sourceKey, required(cells, 1), genres, duration,
                    LocalDate.parse(required(cells, 4)), required(cells, 5), sourceUrl,
                    instant(cells, 7), instant(cells, 8), origin, visibility, optional(cells, 11), rights,
                    required(cells, 13), slug, required(cells, 15), required(cells, 16), palette,
                    required(cells, 18), booleanValue(required(cells, 19))));
            } catch (RuntimeException error) {
                throw new IllegalArgumentException("Dòng " + line + ": " + error.getMessage(), error);
            }
        }
        return result;
    }

    @Transactional
    public ImportReport importRows(List<MovieRow> rows, boolean apply) {
        int created = 0;
        int updated = 0;
        for (var row : rows) {
            var existing = jdbc.queryForList("select slug from movies where source_key = ?", String.class, row.sourceKey());
            var slugOwner = jdbc.queryForList("select source_key from movies where slug = ?", String.class, row.slug());
            if (!existing.isEmpty() && !existing.getFirst().equals(row.slug()))
                throw new IllegalArgumentException("Dòng " + row.line() + ": sourceKey đang gắn với slug khác.");
            if (!slugOwner.isEmpty() && !row.sourceKey().equals(slugOwner.getFirst()))
                throw new IllegalArgumentException("Dòng " + row.line() + ": slug đang thuộc phim khác.");
            if (existing.isEmpty()) created++; else updated++;
        }
        if (apply) for (var row : rows) upsert(row);
        return new ImportReport(rows.size(), created, updated, apply);
    }

    private void upsert(MovieRow row) {
        jdbc.update("""
            insert into movies (id, source_key, slug, title, tagline, synopsis, genres, duration_minutes,
              release_date, age_rating, origin, source_classification, visibility, source_url,
              source_checked_at, verified_at, poster_path, rights_note, palette, artwork_label, featured)
            values (?, ?, ?, ?, ?, ?, string_to_array(?, '|'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, string_to_array(?, '|'), ?, ?)
            on conflict (source_key) do update set title=excluded.title, tagline=excluded.tagline,
              synopsis=excluded.synopsis, genres=excluded.genres, duration_minutes=excluded.duration_minutes,
              release_date=excluded.release_date, age_rating=excluded.age_rating, origin=excluded.origin,
              source_classification=excluded.source_classification, visibility=excluded.visibility,
              source_url=excluded.source_url, source_checked_at=excluded.source_checked_at,
              verified_at=excluded.verified_at, poster_path=excluded.poster_path, rights_note=excluded.rights_note,
              palette=excluded.palette, artwork_label=excluded.artwork_label, featured=excluded.featured
            """, UUID.randomUUID(), row.sourceKey(), row.slug(), row.title(), row.tagline(), row.synopsis(),
            String.join("|", row.genres()), row.durationMinutes(), row.releaseDate(), row.ageRating(), row.country(), row.origin(),
            row.visibility(), row.sourceUrl(), dbTime(row.fetchedAt()), dbTime(row.verifiedAt()), row.posterPath(),
            row.rightsNote(), String.join("|", row.palette()), row.artworkLabel(), row.featured());
    }

    private static java.time.OffsetDateTime dbTime(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    private static String required(List<String> cells, int index) {
        var value = cells.get(index).trim();
        if (value.isEmpty()) throw new IllegalArgumentException(HEADER.get(index) + " không được trống.");
        return value;
    }
    private static String optional(List<String> cells, int index) {
        var value = cells.get(index).trim(); return value.isEmpty() ? null : value;
    }
    private static Instant instant(List<String> cells, int index) {
        var value = optional(cells, index); return value == null ? null : Instant.parse(value);
    }
    private static String[] parts(String value) {
        return Arrays.stream(value.split("\\|", -1)).map(String::trim).filter(part -> !part.isEmpty()).toArray(String[]::new);
    }
    private static boolean booleanValue(String value) {
        if (!value.equals("true") && !value.equals("false")) throw new IllegalArgumentException("featured phải là true hoặc false.");
        return Boolean.parseBoolean(value);
    }

    /** Handles quoted commas, escaped quotes and line breaks without losing Vietnamese text. */
    private static List<List<String>> splitCsv(String content) {
        var rows = new ArrayList<List<String>>(); var row = new ArrayList<String>(); var cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < content.length(); i++) {
            char current = content.charAt(i);
            if (current == '"') {
                if (quoted && i + 1 < content.length() && content.charAt(i + 1) == '"') { cell.append('"'); i++; }
                else quoted = !quoted;
            } else if (current == ',' && !quoted) { row.add(cell.toString()); cell.setLength(0); }
            else if ((current == '\n' || current == '\r') && !quoted) {
                if (current == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') i++;
                row.add(cell.toString()); rows.add(row); row = new ArrayList<>(); cell.setLength(0);
            } else cell.append(current);
        }
        if (quoted) throw new IllegalArgumentException("CSV có dấu ngoặc kép chưa đóng.");
        if (!row.isEmpty() || !cell.isEmpty()) { row.add(cell.toString()); rows.add(row); }
        return rows;
    }
}
