package vn.cineviet.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.ResultSet;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CustomerAuthControllerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final CustomerAuthController auth = new CustomerAuthController(jdbc, new CustomerIdentity(jdbc, mock(ObjectProvider.class)));

    @Test
    void logoutAllInvalidatesTheCurrentSession() throws Exception {
        var accountId = UUID.randomUUID();
        var session = new MockHttpSession();
        session.setAttribute(CustomerIdentity.ACCOUNT, accountId);
        session.setAttribute(CustomerIdentity.SESSION_VERSION, 0);
        when(jdbc.queryForObject("select session_version from accounts where id=? and password_hash like 'pbkdf2-sha256$%'", Integer.class, accountId)).thenReturn(0);
        when(jdbc.update("update accounts set session_version=session_version+1 where id=? and session_version=?", accountId, 0)).thenReturn(1);

        MockMvcBuilders.standaloneSetup(auth).setControllerAdvice(new ApiExceptionHandler()).build()
            .perform(post("/api/auth/logout-all").session(session))
            .andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void registrationNormalizesEmailReplacesPreviousSessionAndRotatesCsrf() {
        var request = new MockHttpServletRequest();
        var prior = request.getSession();
        var priorSessionId = prior.getId();
        prior.setAttribute(CustomerIdentity.ACCOUNT, UUID.randomUUID());
        prior.setAttribute(CustomerIdentity.CSRF, "old-token");

        var response = auth.register(new CustomerAuthController.Credentials("Person@Example.Com", "a strong passphrase"), request);

        assertThat(response.email()).isEqualTo("person@example.com");
        assertThat(response.csrfToken()).isNotEqualTo("old-token");
        assertThat(request.getSession().getId()).isNotEqualTo(priorSessionId);
        assertThat(request.getSession().getAttribute(CustomerIdentity.CSRF)).isEqualTo(response.csrfToken());
        assertThat(request.getSession().getAttribute(CustomerIdentity.ACCOUNT)).isInstanceOf(UUID.class);
        verify(jdbc).update(eq("insert into accounts(id,email,password_hash) values (?,?,?)"),
            any(UUID.class), eq("person@example.com"), argThat(
                hash -> hash instanceof String value && value.startsWith("pbkdf2-sha256$") && !value.contains("a strong passphrase")));
    }

    @Test
    void duplicateEmailDoesNotReplaceTheExistingSession() {
        var request = new MockHttpServletRequest();
        var prior = UUID.randomUUID();
        request.getSession().setAttribute(CustomerIdentity.ACCOUNT, prior);
        when(jdbc.update(eq("insert into accounts(id,email,password_hash) values (?,?,?)"),
            any(UUID.class), eq("person@example.com"), any(String.class)))
            .thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> auth.register(
            new CustomerAuthController.Credentials("person@example.com", "a strong passphrase"), request))
            .isInstanceOf(ApiExceptionHandler.DomainException.class)
            .hasMessage("Email này đã được sử dụng.");
        assertThat(request.getSession().getAttribute(CustomerIdentity.ACCOUNT)).isEqualTo(prior);
    }

    @Test
    @SuppressWarnings("unchecked")
    void loginUsesStoredHashAndReturnsTheAccountSession() throws Exception {
        var accountId = UUID.randomUUID();
        var resultSet = mock(ResultSet.class);
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getObject("id", UUID.class)).thenReturn(accountId);
        when(resultSet.getString("email")).thenReturn("person@example.com");
        when(resultSet.getString("password_hash")).thenReturn(PasswordHasher.hash("a strong passphrase"));
        when(resultSet.getInt("session_version")).thenReturn(3);
        when(jdbc.query(eq("select id,email,password_hash,session_version from accounts where lower(email)=?"),
            any(ResultSetExtractor.class), eq("person@example.com")))
            .thenAnswer(call -> ((ResultSetExtractor<?>) call.getArgument(1)).extractData(resultSet));

        var request = new MockHttpServletRequest();
        var response = auth.login(new CustomerAuthController.Credentials("PERSON@example.com", "a strong passphrase"), request);

        assertThat(response.email()).isEqualTo("person@example.com");
        assertThat(request.getSession().getAttribute(CustomerIdentity.ACCOUNT)).isEqualTo(accountId);
        assertThat(request.getSession().getAttribute(CustomerIdentity.SESSION_VERSION)).isEqualTo(3);
        assertThat(request.getSession().getAttribute(CustomerIdentity.CSRF)).isEqualTo(response.csrfToken());
    }
}
