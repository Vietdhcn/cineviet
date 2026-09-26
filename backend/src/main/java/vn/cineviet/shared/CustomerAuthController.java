package vn.cineviet.shared;

import static vn.cineviet.shared.ApiExceptionHandler.DomainException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@ConditionalOnProperty(name = "cineviet.customer-auth-enabled", havingValue = "true")
public class CustomerAuthController {
    private final JdbcTemplate jdbc;
    private final DemoIdentity identity;
    private static final String DUMMY_HASH = PasswordHasher.hash(UUID.randomUUID().toString());

    public CustomerAuthController(JdbcTemplate jdbc, DemoIdentity identity) { this.jdbc = jdbc; this.identity = identity; }

    public record Credentials(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12, max = 128) String password
    ) {}
    public record AuthSession(String email, String csrfToken) {}
    public record Profile(String email) {}
    private record Account(UUID id, String email, String passwordHash, int sessionVersion) {}

    /** A CSRF token can be obtained without silently creating a demo account. */
    @GetMapping("/csrf")
    public java.util.Map<String, String> csrf(HttpServletRequest request) {
        var session = request.getSession();
        if (!(session.getAttribute(DemoIdentity.CSRF) instanceof String))
            session.setAttribute(DemoIdentity.CSRF, UUID.randomUUID().toString());
        return java.util.Map.of("csrfToken", (String) session.getAttribute(DemoIdentity.CSRF));
    }

    @GetMapping("/me")
    public Profile me(HttpServletRequest request) {
        var id = identity.accountId(request);
        var email = jdbc.query("select email from accounts where id=? and password_hash like 'pbkdf2-sha256$%'",
            rs -> rs.next() ? rs.getString("email") : null, id);
        if (email == null)
            throw new DomainException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED", "Vui lòng đăng nhập.");
        return new Profile(email);
    }

    @PostMapping("/register")
    public AuthSession register(@Valid @RequestBody Credentials credentials, HttpServletRequest request) {
        var email = normalizedEmail(credentials.email());
        var id = UUID.randomUUID();
        try {
            jdbc.update("insert into accounts(id,email,password_hash) values (?,?,?)", id, email, PasswordHasher.hash(credentials.password()));
        } catch (DataIntegrityViolationException error) {
            throw new DomainException(HttpStatus.CONFLICT, "EMAIL_UNAVAILABLE", "Email này đã được sử dụng.");
        }
        return establish(request, id, email, 0);
    }

    @PostMapping("/login")
    public AuthSession login(@Valid @RequestBody Credentials credentials, HttpServletRequest request) {
        var email = normalizedEmail(credentials.email());
        var account = jdbc.query("select id,email,password_hash,session_version from accounts where lower(email)=?", rs ->
            rs.next() ? new Account(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("password_hash"), rs.getInt("session_version")) : null, email);
        var realHash = account != null && account.passwordHash().startsWith("pbkdf2-sha256$");
        var storedHash = realHash ? account.passwordHash() : DUMMY_HASH;
        var matches = PasswordHasher.matches(credentials.password(), storedHash);
        if (!realHash || !matches)
            throw new DomainException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        return establish(request, account.id(), account.email(), account.sessionVersion());
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll(HttpServletRequest request) {
        var id = identity.accountId(request);
        var session = request.getSession(false);
        var version = (Integer) session.getAttribute(DemoIdentity.SESSION_VERSION);
        var changed = jdbc.update("update accounts set session_version=session_version+1 where id=? and session_version=?", id, version);
        session.invalidate();
        if (changed != 1)
            throw new DomainException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED", "Vui lòng đăng nhập để tiếp tục.");
        return ResponseEntity.noContent().build();
    }

    private static AuthSession establish(HttpServletRequest request, UUID id, String email, int version) {
        var session = request.getSession();
        request.changeSessionId();
        session.setAttribute(DemoIdentity.ACCOUNT, id);
        session.setAttribute(DemoIdentity.SESSION_VERSION, version);
        var csrf = UUID.randomUUID().toString();
        session.setAttribute(DemoIdentity.CSRF, csrf);
        return new AuthSession(email, csrf);
    }

    private static String normalizedEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }
}
