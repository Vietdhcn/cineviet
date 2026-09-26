package vn.cineviet.catalog;

import java.nio.file.Path;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Run with a non-web Spring process; dry-run is the default. */
@Component
@ConditionalOnProperty("cineviet.catalog-import.path")
public class MovieCsvImportRunner implements ApplicationRunner {
    private final MovieCsvImporter importer;
    private final Environment environment;

    public MovieCsvImportRunner(MovieCsvImporter importer, Environment environment) {
        this.importer = importer;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments arguments) throws Exception {
        if (!"none".equalsIgnoreCase(environment.getProperty("spring.main.web-application-type", "")))
            throw new IllegalArgumentException("Import CSV chỉ chạy ở chế độ --spring.main.web-application-type=none.");
        if (environment.getProperty("cineviet.scheduling.enabled", Boolean.class, true))
            throw new IllegalArgumentException("Import CSV cần --cineviet.scheduling.enabled=false để tắt tác vụ nền.");
        var path = Path.of(environment.getRequiredProperty("cineviet.catalog-import.path"));
        boolean apply = environment.getProperty("cineviet.catalog-import.apply", Boolean.class, false);
        var rows = importer.parse(path);
        var report = importer.importRows(rows, apply);
        System.out.printf("Movie CSV %s: %d rows; %d new; %d existing.%n",
            report.applied() ? "APPLIED" : "DRY RUN", report.total(), report.created(), report.updated());
    }
}
