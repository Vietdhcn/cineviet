package vn.cineviet.catalog;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.mock.env.MockEnvironment;

class MovieCsvImportRunnerTest {
    @Test void refusesWebProcessOrActiveWorkers() throws Exception {
        var importer = mock(MovieCsvImporter.class);
        var web = new MockEnvironment().withProperty("spring.main.web-application-type", "servlet");
        var worker = new MockEnvironment().withProperty("spring.main.web-application-type", "none");
        var args = new DefaultApplicationArguments();
        assertThrows(IllegalArgumentException.class, () -> new MovieCsvImportRunner(importer, web).run(args));
        assertThrows(IllegalArgumentException.class, () -> new MovieCsvImportRunner(importer, worker).run(args));
        verifyNoInteractions(importer);
    }
}
