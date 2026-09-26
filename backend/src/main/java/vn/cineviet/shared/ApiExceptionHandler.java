package vn.cineviet.shared;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(DomainException.class)
    ResponseEntity<Map<String, Object>> domain(DomainException error) {
        return ResponseEntity.status(error.status()).body(Map.of("message", error.getMessage(), "code", error.code(), "timestamp", Instant.now()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException error) {
        var message = error.getBindingResult().getFieldErrors().stream().findFirst().map(item -> item.getField() + ": " + item.getDefaultMessage()).orElse("Dữ liệu không hợp lệ.");
        return ResponseEntity.badRequest().body(Map.of("message", message, "code", "VALIDATION_ERROR", "timestamp", Instant.now()));
    }

    public static final class DomainException extends RuntimeException {
        private final HttpStatus status; private final String code;
        public DomainException(HttpStatus status, String code, String message) { super(message); this.status = status; this.code = code; }
        public HttpStatus status() { return status; }
        public String code() { return code; }
    }
}
