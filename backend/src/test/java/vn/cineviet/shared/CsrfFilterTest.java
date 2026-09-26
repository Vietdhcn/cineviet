package vn.cineviet.shared;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

class CsrfFilterTest {
    private final CsrfFilter filter = new CsrfFilter();

    @Test
    void rejectsMutationWithoutMatchingSessionToken() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/bookings/hold");
        request.setServletPath("/api/bookings/hold");
        var session = new MockHttpSession();
        session.setAttribute(CustomerIdentity.CSRF, "expected-token");
        request.setSession(session);
        request.addHeader("X-CSRF-Token", "wrong-token");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void acceptsMatchingSessionToken() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/bookings/hold");
        request.setServletPath("/api/bookings/hold");
        var session = new MockHttpSession();
        session.setAttribute(CustomerIdentity.CSRF, "expected-token");
        request.setSession(session);
        request.addHeader("X-CSRF-Token", "expected-token");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isSameAs(request);
    }
}
