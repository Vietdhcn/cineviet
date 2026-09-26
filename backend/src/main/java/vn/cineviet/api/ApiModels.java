package vn.cineviet.api;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ApiModels {
    private ApiModels() {}

    public record CinemaDto(UUID id, String name, String address, String city) {}
    public record MovieDto(UUID id, String slug, String title, String tagline, String synopsis, List<String> genres, int durationMinutes, String ageRating, String origin, int year, List<String> palette, String artworkLabel, boolean featured) {}
    public record ShowtimeDto(UUID id, UUID movieId, UUID cinemaId, Instant startsAt, String room, String format, BigDecimal basePrice) {}
    public record SeatDto(String id, String row, int number, String kind, String status, BigDecimal price) {}
    public record BookingItemDto(UUID seatId, String seatLabel, BigDecimal price, UUID ticketToken) {}
    public record BookingDto(UUID id, String reference, UUID showtimeId, List<BookingItemDto> items, String status, Instant expiresAt, BigDecimal total, Instant createdAt) {}
    public record HoldRequest(@NotNull UUID showtimeId, @NotEmpty @Size(max = 8) List<UUID> seatIds) {}
    public record RecommendationDto(MovieDto movie, double score, List<String> reasons, Instant earliestShowtime) {}
    public record RecommendationQuery(UUID cinemaId, LocalDate date, List<String> preferredGenres) {}
}
