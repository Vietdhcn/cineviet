package vn.cineviet.catalog;

import static vn.cineviet.api.ApiModels.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CatalogController {
    private final CatalogService catalog;
    public CatalogController(CatalogService catalog) { this.catalog = catalog; }
    @GetMapping("/movies") public List<MovieDto> movies() { return catalog.movies(); }
    @GetMapping("/cinemas") public List<CinemaDto> cinemas() { return catalog.cinemas(); }
    @GetMapping("/showtimes") public List<ShowtimeDto> showtimes(@RequestParam(required = false) UUID cinemaId, @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) { return catalog.showtimes(cinemaId, date); }
    @GetMapping("/showtimes/{showtimeId}") public ShowtimeDto showtime(@PathVariable UUID showtimeId) { return catalog.showtime(showtimeId); }
    @GetMapping("/showtimes/{showtimeId}/seats") public List<SeatDto> seats(@PathVariable UUID showtimeId) { return catalog.seats(showtimeId); }
}
