package vn.cineviet.booking;

import static vn.cineviet.api.ApiModels.PaymentOutcome;
import static vn.cineviet.api.ApiModels.PaymentRequest;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.cineviet.shared.ApiExceptionHandler.DomainException;

@RestController
@RequestMapping("/api/bookings")
@ConditionalOnProperty(name = "cineviet.demo-enabled", havingValue = "true")
public class DemoPaymentController {
    private final BookingService bookings;

    public DemoPaymentController(BookingService bookings) { this.bookings = bookings; }

    @PostMapping("/{id}/demo-payment")
    ResponseEntity<?> payment(@PathVariable UUID id, @RequestHeader("Idempotency-Key") String idempotencyKey,
                              @Valid @RequestBody PaymentRequest request) {
        if (request.outcome() == PaymentOutcome.FAILED) {
            bookings.recordFailedPayment(id, idempotencyKey);
            throw new DomainException(HttpStatus.UNPROCESSABLE_CONTENT, "DEMO_PAYMENT_FAILED", "Thanh toán mô phỏng thất bại. Ghế vẫn được giữ nếu đồng hồ còn thời gian.");
        }
        return ResponseEntity.ok(bookings.confirm(id, idempotencyKey));
    }
}
