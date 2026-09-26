package vn.cineviet.shared;

import static vn.cineviet.shared.ApiExceptionHandler.DomainException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Component
public class DemoIdentity {
    static final String ACCOUNT = "cineviet.account";
    static final String CSRF = "cineviet.csrf";
    static final String SESSION_VERSION = "cineviet.session-version";
    private final JdbcTemplate jdbc;
    private final ObjectProvider<HttpServletRequest> requestProvider;
    private final boolean customerAuthEnabled;

    public DemoIdentity(JdbcTemplate jdbc, ObjectProvider<HttpServletRequest> requestProvider,
                        @Value("${cineviet.customer-auth-enabled:true}") boolean customerAuthEnabled) {
        this.jdbc = jdbc;
        this.requestProvider = requestProvider;
        this.customerAuthEnabled = customerAuthEnabled;
    }

    public UUID accountId() {
        return accountId(requestProvider.getObject());
    }

    public UUID accountId(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || !(session.getAttribute(ACCOUNT) instanceof UUID id))
            throw new DomainException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED",
                customerAuthEnabled ? "Vui lòng đăng nhập để tiếp tục." : "Phiên demo đã hết hạn. Vui lòng tải lại trang.");
        if (customerAuthEnabled) {
            var version = session.getAttribute(SESSION_VERSION);
            Integer currentVersion = null;
            if (version instanceof Integer) {
                try {
                    currentVersion = jdbc.queryForObject("select session_version from accounts where id=? and password_hash like 'pbkdf2-sha256$%'", Integer.class, id);
                } catch (EmptyResultDataAccessException ignored) { /* Deleted or disabled account. */ }
            }
            if (!(version instanceof Integer) || !version.equals(currentVersion))
                throw new DomainException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED", "Vui lòng đăng nhập để tiếp tục.");
        }
        return id;
    }

    public Map<String, String> establish(HttpSession session) {
        synchronized (session) {
            if (!(session.getAttribute(ACCOUNT) instanceof UUID)) {
                var accountId = UUID.randomUUID();
                jdbc.update("insert into accounts(id,email,password_hash) values (?,?,?)", accountId, "demo-" + accountId + "@cineviet.local", "SESSION-DEMO-NO-PASSWORD");
                session.setAttribute(ACCOUNT, accountId);
            }
            if (!(session.getAttribute(CSRF) instanceof String)) session.setAttribute(CSRF, UUID.randomUUID().toString());
            return Map.of("csrfToken", (String) session.getAttribute(CSRF));
        }
    }
}

@RestController
@RequestMapping("/api/session")
@ConditionalOnProperty(name = "cineviet.demo-enabled", havingValue = "true")
class DemoSessionController {
    private final DemoIdentity identity;
    DemoSessionController(DemoIdentity identity) { this.identity = identity; }
    @GetMapping Map<String, String> session(HttpSession session) { return identity.establish(session); }
}
