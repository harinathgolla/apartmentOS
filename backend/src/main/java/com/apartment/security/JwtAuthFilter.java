package com.apartment.security;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component @RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            try {
                Claims c = jwtService.parse(h.substring(7));
                String role = c.get("role", String.class);
                Long userId = ((Number) c.get("uid")).longValue();
                Long orgId = c.get("oid") == null ? null : ((Number) c.get("oid")).longValue();
                Long aptId = c.get("aptId") == null ? null : ((Number) c.get("aptId")).longValue();
                var auth = new UsernamePasswordAuthenticationToken(
                        c.getSubject(), null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                auth.setDetails(new AuthDetails(userId, orgId, role, aptId));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {}
        }
        chain.doFilter(req, res);
    }
}
