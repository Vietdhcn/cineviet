package vn.cineviet.catalog;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;

class MovieCsvImporterTest {
    @TempDir Path temp;

    @Test void parsesTimestampedDraftFixture() throws Exception {
        var rows = new MovieCsvImporter(mock(JdbcTemplate.class)).parse(
            Path.of("..", "tests", "fixtures", "movie-with-timestamps.csv"));
        assertEquals(1, rows.size());
        assertEquals(Instant.parse("2026-09-26T08:30:00Z"), rows.getFirst().fetchedAt());
        assertEquals(Instant.parse("2026-09-26T09:15:00Z"), rows.getFirst().verifiedAt());
        assertEquals("DRAFT", rows.getFirst().visibility());
    }

    @Test void parsesTwelveSyntheticMovies() throws Exception {
        var importer = new MovieCsvImporter(mock(JdbcTemplate.class));
        var rows = importer.parse(Path.of("..", "data", "movies.reference.csv"));
        assertEquals(12, rows.size());
        assertEquals(12, rows.stream().map(MovieCsvImporter.MovieRow::sourceKey).distinct().count());
        assertEquals("Không có đường tắt ở độ cao 3.000 mét.", rows.get(1).tagline());
        assertTrue(rows.stream().allMatch(row -> row.origin().equals("SYNTHETIC") && row.visibility().equals("PUBLISHED")));
    }

    @Test void preservesQuotedCommaInCsv() throws Exception {
        var input = Files.readString(Path.of("..", "data", "movies.reference.csv"));
        var path = temp.resolve("quoted.csv");
        Files.writeString(path, input.replace("Công thức cũ. Một gia đình mới.", "\"Công thức cũ, một gia đình mới.\""));
        var rows = new MovieCsvImporter(mock(JdbcTemplate.class)).parse(path);
        assertEquals("Công thức cũ, một gia đình mới.", rows.get(2).tagline());
    }

    @Test void rejectsPublishedUnverifiedReferenceBeforeDatabaseWrites() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var importer = new MovieCsvImporter(jdbc);
        var input = Files.readString(Path.of("..", "data", "movies.reference.csv"));
        var invalid = input.replaceFirst("SYNTHETIC,PUBLISHED", "BETA_REFERENCE,PUBLISHED");
        var path = temp.resolve("invalid.csv");
        Files.writeString(path, invalid);
        assertTrue(assertThrows(IllegalArgumentException.class, () -> importer.parse(path)).getMessage().contains("Dòng 2"));
        verifyNoInteractions(jdbc);
    }

    @Test void dryRunReportsNewAndExistingWithoutMutation() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var importer = new MovieCsvImporter(jdbc);
        var rows = importer.parse(Path.of("..", "data", "movies.reference.csv")).subList(0, 2);
        when(jdbc.queryForList(eq("select slug from movies where source_key = ?"), eq(String.class), any()))
            .thenAnswer(call -> call.getArgument(2).equals(rows.getFirst().sourceKey())
                ? List.of(rows.getFirst().slug()) : List.of());
        when(jdbc.queryForList(eq("select source_key from movies where slug = ?"), eq(String.class), any()))
            .thenAnswer(call -> call.getArgument(2).equals(rows.getFirst().slug())
                ? List.of(rows.getFirst().sourceKey()) : List.of());
        assertEquals(new MovieCsvImporter.ImportReport(2, 1, 1, false), importer.importRows(rows, false));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
