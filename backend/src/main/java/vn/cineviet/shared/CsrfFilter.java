package vn.cineviet.shared;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CsrfFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        var method = request.getMethod();
        if (request.getServletPath().startsWith("/api/") && !(method.equals("GET") || method.equals("HEAD") || method.equals("OPTIONS"))) {
            var session = request.getSession(false);
            var expected = session == null ? null : session.getAttribute(CustomerIdentity.CSRF);
            var received = request.getHeader("X-CSRF-Token");
            if (!(expected instanceof String token) || received == null ||
                !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8), received.getBytes(StandardCharsets.UTF_8))) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid CSRF token");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
