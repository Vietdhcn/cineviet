package vn.cineviet.shared;

import static vn.cineviet.shared.ApiExceptionHandler.DomainException;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class CustomerIdentity {
    static final String ACCOUNT = "cineviet.account";
    static final String CSRF = "cineviet.csrf";
    static final String SESSION_VERSION = "cineviet.session-version";
    private final JdbcTemplate jdbc;
    private final ObjectProvider<HttpServletRequest> requestProvider;
    public CustomerIdentity(JdbcTemplate jdbc, ObjectProvider<HttpServletRequest> requestProvider) {
        this.jdbc = jdbc;
        this.requestProvider = requestProvider;
    }

    public UUID accountId() {
        return accountId(requestProvider.getObject());
    }

    public UUID accountId(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || !(session.getAttribute(ACCOUNT) instanceof UUID id))
            throw new DomainException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED", "Vui lòng đăng nhập để tiếp tục.");
        var version = session.getAttribute(SESSION_VERSION);
        Integer currentVersion = null;
        if (version instanceof Integer) {
            try {
                currentVersion = jdbc.queryForObject("select session_version from accounts where id=? and password_hash like 'pbkdf2-sha256$%'", Integer.class, id);
            } catch (EmptyResultDataAccessException ignored) { /* Deleted or disabled account. */ }
        }
        if (!(version instanceof Integer) || !version.equals(currentVersion))
            throw new DomainException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED", "Vui lòng đăng nhập để tiếp tục.");
        return id;
    }
}
