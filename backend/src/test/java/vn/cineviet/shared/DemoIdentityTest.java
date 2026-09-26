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

class DemoIdentityTest {
    @Test
    @SuppressWarnings("unchecked")
    void rejectsAnOlderCustomerSessionAfterItsAccountVersionChanges() {
        var jdbc = mock(JdbcTemplate.class);
        var provider = mock(ObjectProvider.class);
        var identity = new DemoIdentity(jdbc, provider, true);
        var request = new MockHttpServletRequest();
        var accountId = UUID.randomUUID();
        request.getSession().setAttribute(DemoIdentity.ACCOUNT, accountId);
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
        var identity = new DemoIdentity(mock(JdbcTemplate.class), provider, false);
        verifyNoInteractions(provider); // Offline CSV import must start without a servlet request.

        var request = new MockHttpServletRequest();
        var accountId = UUID.randomUUID();
        request.getSession().setAttribute(DemoIdentity.ACCOUNT, accountId);
        when(provider.getObject()).thenReturn((HttpServletRequest) request);

        assertThat(identity.accountId()).isEqualTo(accountId);
    }
}
