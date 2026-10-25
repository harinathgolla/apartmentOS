package com.apartment.service;
import com.apartment.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Slf4j @Component @RequiredArgsConstructor
public class OAuthTokenPersistence implements AuthenticationSuccessHandler {
    private final OAuth2AuthorizedClientService clients;
    private final UserRepository users;

    @Value("${app.frontend.url}") private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth)
            throws IOException {
        try {
            OAuth2AuthenticationToken t = (OAuth2AuthenticationToken) auth;
            OAuth2User principal = t.getPrincipal();
            String email = principal.getAttribute("email");
            OAuth2AuthorizedClient client = clients.loadAuthorizedClient(
                    t.getAuthorizedClientRegistrationId(), t.getName());
            String refresh = client.getRefreshToken() != null
                    ? client.getRefreshToken().getTokenValue() : null;
            users.findByEmail(email).ifPresent(u -> {
                if (refresh != null) {
                    u.setGoogleRefreshToken(refresh);
                    u.setGoogleConnected(true);
                    users.save(u);
                    log.info("Stored Google refresh token for {}", email);
                } else {
                    log.warn("No refresh token returned for {} — offline consent not granted", email);
                }
            });
        } catch (Exception e) {
            log.error("OAuth success handler failed", e);
        }
        res.sendRedirect(frontendUrl + "/owner?gmail=connected");
    }
}
