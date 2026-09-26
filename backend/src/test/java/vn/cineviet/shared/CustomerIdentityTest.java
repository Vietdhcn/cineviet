package vn.cineviet.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;

class CustomerIdentityTest {
    @Test
    @SuppressWarnings("unchecked")
    void rejectsAnOlderCustomerSessionAfterItsAccountVersionChanges() {
        var jdbc = mock(JdbcTemplate.class);
        var provider = mock(ObjectProvider.class);
        var identity = new CustomerIdentity(jdbc, provider);
        var request = new MockHttpServletRequest();
        var accountId = UUID.randomUUID();
        request.getSession().setAttribute(CustomerIdentity.ACCOUNT, accountId);
        request.getSession().setAttribute("cineviet.session-version", 1);
        when(provider.getObject()).thenReturn((HttpServletRequest) request);
        when(jdbc.queryForObject("select session_version from accounts where id=? and password_hash like 'pbkdf2-sha256$%'", Integer.class, accountId)).thenReturn(2);

        assertThatThrownBy(identity::accountId)
            .isInstanceOf(ApiExceptionHandler.DomainException.class)
            .hasMessage("Vui lòng đăng nhập để tiếp tục.");
    }

    @Test
    @SuppressWarnings("unchecked")
    void resolvesHttpRequestOnlyWhenReadingTheCurrentAccount() {
        var provider = mock(ObjectProvider.class);
        var jdbc = mock(JdbcTemplate.class);
        var identity = new CustomerIdentity(jdbc, provider);
        verifyNoInteractions(provider); // Offline CSV import must start without a servlet request.

        var request = new MockHttpServletRequest();
        var accountId = UUID.randomUUID();
        request.getSession().setAttribute(CustomerIdentity.ACCOUNT, accountId);
        request.getSession().setAttribute(CustomerIdentity.SESSION_VERSION, 0);
        when(jdbc.queryForObject("select session_version from accounts where id=? and password_hash like 'pbkdf2-sha256$%'", Integer.class, accountId)).thenReturn(0);
        when(provider.getObject()).thenReturn((HttpServletRequest) request);

        assertThat(identity.accountId()).isEqualTo(accountId);
    }
}
