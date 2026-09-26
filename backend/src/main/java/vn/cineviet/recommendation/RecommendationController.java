package vn.cineviet.recommendation;

import static vn.cineviet.api.ApiModels.RecommendationDto;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {
    private final RecommendationService service;
    public RecommendationController(RecommendationService service) { this.service = service; }
    @GetMapping
    List<RecommendationDto> recommend(@RequestParam UUID cinemaId, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, @RequestParam(defaultValue = "") String preferredGenres) {
        var preferred = preferredGenres.isBlank() ? List.<String>of() : Arrays.stream(preferredGenres.split(",")).map(String::trim).filter(value -> !value.isBlank()).toList();
        return service.recommend(cinemaId, date, preferred);
    }
}

