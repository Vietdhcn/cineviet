package vn.cineviet.booking;

import static vn.cineviet.api.ApiModels.*;
import static vn.cineviet.shared.ApiExceptionHandler.DomainException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.cineviet.shared.CustomerIdentity;

@Service
public class BookingService {
    private final JdbcTemplate jdbc; private final CustomerIdentity identity;
    public BookingService(JdbcTemplate jdbc, CustomerIdentity identity) { this.jdbc = jdbc; this.identity = identity; }

    @Transactional
    public BookingDto hold(HoldRequest request, String idempotencyKey) {
        var distinct = request.seatIds().stream().distinct().sorted().toList();
        if (distinct.size() != request.seatIds().size() || distinct.isEmpty() || distinct.size() > 8) throw new DomainException(HttpStatus.BAD_REQUEST, "INVALID_SEAT_COUNT", "Vui lòng chọn từ 1 đến 8 ghế khác nhau.");
        requireKey(idempotencyKey);
        var signature = hash(request.showtimeId() + "|" + distinct);
        var accountId = identity.accountId();
        jdbc.queryForObject("select id from accounts where id=? for update", UUID.class, accountId);
        var previous = idempotencyRecord(accountId, "hold", idempotencyKey);
        if (previous != null) {
            if (!previous.requestHash().equals(signature)) throw reusedKey();
            return requireBooking(previous.bookingId());
        }
        expireForAccount();
        var active = jdbc.queryForObject("select count(*) from bookings where account_id=? and status='HELD' and expires_at>clock_timestamp()", Integer.class, accountId);
        if (active != null && active > 0) throw new DomainException(HttpStatus.CONFLICT, "ACTIVE_HOLD_EXISTS", "Tài khoản đang có một đơn giữ chỗ. Hãy hoàn tất hoặc hủy đơn đó trước.");
        var showtimeStart = jdbc.query("""
            select s.starts_at from showtimes s
            join movies m on m.id = s.movie_id
            join cinemas c on c.id = s.cinema_id
            where s.id = ? and m.visibility = 'PUBLISHED' and c.active
            for update of s
            """, rs -> rs.next() ? rs.getTimestamp(1).toInstant() : null, request.showtimeId());
        if (showtimeStart == null) throw new DomainException(HttpStatus.NOT_FOUND, "SHOWTIME_NOT_FOUND", "Suất chiếu không tồn tại.");
        var placeholders = String.join(",", java.util.Collections.nCopies(distinct.size(), "?"));
        var params = new java.util.ArrayList<Object>(); params.add(request.showtimeId()); params.addAll(distinct);
        var locked = jdbc.query("select seat_id, price, status from showtime_seats where showtime_id=? and seat_id in (" + placeholders + ") order by seat_id for update", (rs, row) -> new LockedSeat(rs.getObject("seat_id", UUID.class), rs.getBigDecimal("price"), rs.getString("status")), params.toArray());
        if (locked.size() != distinct.size() || locked.stream().anyMatch(seat -> !"AVAILABLE".equals(seat.status()))) throw new DomainException(HttpStatus.CONFLICT, "SEAT_CONFLICT", "Một hoặc nhiều ghế vừa được chọn. Vui lòng tải lại sơ đồ.");
        var now = jdbc.queryForObject("select clock_timestamp()", java.sql.Timestamp.class).toInstant();
        if (!showtimeStart.isAfter(now)) throw new DomainException(HttpStatus.CONFLICT, "SHOWTIME_STARTED", "Suất chiếu đã bắt đầu.");
        var expiresAt = now.plusSeconds(300).isBefore(showtimeStart) ? now.plusSeconds(300) : showtimeStart;
        var bookingId = UUID.randomUUID(); var reference = "CV" + bookingId.toString().replace("-", "").substring(0, 12).toUpperCase();
        jdbc.update("insert into bookings(id, account_id, showtime_id, reference, status, expires_at, created_at) values (?,?,?,?, 'HELD', ?, clock_timestamp())", bookingId, accountId, request.showtimeId(), reference, expiresAt.atOffset(ZoneOffset.UTC));
        for (var seat : locked) {
            jdbc.update("update showtime_seats set status='HELD', owner_booking_id=? where showtime_id=? and seat_id=?", bookingId, request.showtimeId(), seat.id());
            jdbc.update("insert into booking_items(id, booking_id, seat_id, unit_price) values (?,?,?,?)", UUID.randomUUID(), bookingId, seat.id(), seat.price());
        }
        jdbc.update("insert into idempotency_records(account_id,endpoint,idempotency_key,request_hash,booking_id,created_at) values (?,?,?,?,?,clock_timestamp())", accountId, "hold", idempotencyKey, signature, bookingId);
        return requireBooking(bookingId);
    }

    @Transactional
    public BookingDto cancel(UUID bookingId) {
        var accountId = identity.accountId();
        var changed = jdbc.update("update bookings set status='CANCELLED' where id=? and account_id=? and status='HELD'", bookingId, accountId);
        if (changed > 0) jdbc.update("update showtime_seats set status='AVAILABLE', owner_booking_id=null where owner_booking_id=? and status='HELD'", bookingId);
        return requireBooking(bookingId);
    }

    public BookingDto get(UUID id) { return requireBooking(id); }
    public List<BookingDto> list() { return jdbc.query("select id from bookings where account_id=? order by created_at desc", (rs, row) -> rs.getObject(1, UUID.class), identity.accountId()).stream().map(this::requireBooking).toList(); }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void expireWorker() {
        var ids = jdbc.query("select id from bookings where status='HELD' and expires_at<=clock_timestamp() order by id for update skip locked limit 100", (rs, row) -> rs.getObject(1, UUID.class));
        ids.forEach(this::expireBooking);
    }

    private void expireForAccount() { jdbc.query("select id from bookings where account_id=? and status='HELD' and expires_at<=clock_timestamp() for update", (rs, row) -> rs.getObject(1, UUID.class), identity.accountId()).forEach(this::expireBooking); }
    private void expireBooking(UUID id) { jdbc.update("update bookings set status='EXPIRED' where id=? and status='HELD'", id); jdbc.update("update showtime_seats set status='AVAILABLE', owner_booking_id=null where owner_booking_id=? and status='HELD'", id); }

    private BookingDto requireBooking(UUID id) {
        var bookings = jdbc.query("select id, reference, showtime_id, status, expires_at, created_at from bookings where id=? and account_id=?", (rs, row) -> mapBooking(rs), id, identity.accountId());
        if (bookings.isEmpty()) throw new DomainException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt vé.");
        return bookings.getFirst();
    }
    private BookingDto mapBooking(ResultSet rs) throws SQLException {
        var id = rs.getObject("id", UUID.class);
        var items = jdbc.query("""
            select bi.seat_id, s.row_label || s.seat_number as seat_label, bi.unit_price, t.token
            from booking_items bi join seats s on s.id=bi.seat_id left join tickets t on t.booking_item_id=bi.id
            where bi.booking_id=? order by s.row_label, s.seat_number
            """, (itemRs, row) -> new BookingItemDto(itemRs.getObject("seat_id", UUID.class), itemRs.getString("seat_label"), itemRs.getBigDecimal("unit_price"), itemRs.getObject("token", UUID.class)), id);
        var total = items.stream().map(BookingItemDto::price).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new BookingDto(id, rs.getString("reference"), rs.getObject("showtime_id", UUID.class), items, rs.getString("status"), rs.getTimestamp("expires_at").toInstant(), total, rs.getTimestamp("created_at").toInstant());
    }
    private record LockedSeat(UUID id, BigDecimal price, String status) {}
    private record IdempotencyRecord(String requestHash, UUID bookingId) {}

    private IdempotencyRecord idempotencyRecord(UUID accountId, String endpoint, String key) {
        return jdbc.query("select request_hash, booking_id from idempotency_records where account_id=? and endpoint=? and idempotency_key=?", rs -> rs.next() ? new IdempotencyRecord(rs.getString(1), rs.getObject(2, UUID.class)) : null, accountId, endpoint, key);
    }
    private static void requireKey(String key) {
        if (key == null || key.isBlank() || key.length() > 200) throw new DomainException(HttpStatus.BAD_REQUEST, "IDEMPOTENCY_REQUIRED", "Idempotency-Key phải có từ 1 đến 200 ký tự.");
    }
    private static DomainException reusedKey() { return new DomainException(HttpStatus.CONFLICT, "IDEMPOTENCY_REUSED", "Idempotency-Key đã được dùng cho yêu cầu khác."); }
    private static String hash(String value) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException("SHA-256 unavailable", error); }
    }
}
