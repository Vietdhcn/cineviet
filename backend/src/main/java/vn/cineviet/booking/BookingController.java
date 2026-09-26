package vn.cineviet.booking;

import static vn.cineviet.api.ApiModels.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService bookings;
    public BookingController(BookingService bookings) { this.bookings = bookings; }
    @PostMapping("/hold") BookingDto hold(@RequestHeader("Idempotency-Key") String idempotencyKey, @Valid @RequestBody HoldRequest request) { return bookings.hold(request, idempotencyKey); }
    @PostMapping("/{id}/cancel") BookingDto cancel(@PathVariable UUID id) { return bookings.cancel(id); }
    @GetMapping("/{id}") BookingDto get(@PathVariable UUID id) { return bookings.get(id); }
    @GetMapping List<BookingDto> list() { return bookings.list(); }
}
