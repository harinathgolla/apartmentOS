package com.apartment.service;
import com.apartment.domain.*;
import com.apartment.dto.AuthDtos.*;
import com.apartment.repo.*;
import com.apartment.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final OrgRepository orgs;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    @Transactional
    public AuthResponse register(RegisterRequest r) {
        if (users.findByEmail(r.email()).isPresent())
            throw new IllegalArgumentException("Email already registered");

        Org org = null;
        if ("OWNER".equalsIgnoreCase(r.role()) && r.orgName() != null && !r.orgName().isBlank()) {
            String slug = r.orgName().toLowerCase().replaceAll("[^a-z0-9]+", "-")
                    + "-" + System.currentTimeMillis() % 10000;
            org = orgs.save(Org.builder()
                    .name(r.orgName()).slug(slug)
                    .plan(Org.Plan.TRIAL)
                    .trialEndsAt(Instant.now().plus(30, ChronoUnit.DAYS))
                    .billingEmail(r.email())
                    .build());
        }

        User u = users.save(User.builder()
                .email(r.email())
                .passwordHash(encoder.encode(r.password()))
                .fullName(r.fullName())
                .phone(r.phone())
                .role(User.Role.valueOf(r.role().toUpperCase()))
                .orgId(org == null ? null : org.getId())
                .build());

        return token(u);
    }

    public AuthResponse login(LoginRequest r) {
        User u = users.findByEmail(r.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (u.getPasswordHash() == null || !encoder.matches(r.password(), u.getPasswordHash()))
            throw new IllegalArgumentException("Invalid credentials");
        u.setLastLoginAt(Instant.now());
        users.save(u);
        return token(u);
    }

    public AuthResponse token(User u) {
        String t = jwt.generate(u.getEmail(), Map.of(
                "uid", u.getId(),
                "oid", u.getOrgId() == null ? 0 : u.getOrgId(),
                "role", u.getRole().name(),
                "aptId", 0));
        return new AuthResponse(t, u.getId(), u.getOrgId(), null,
                u.getRole().name(), u.getEmail(), u.getFullName());
    }
}
