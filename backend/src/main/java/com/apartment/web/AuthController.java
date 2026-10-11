package com.apartment.web;
import com.apartment.domain.User;
import com.apartment.dto.AuthDtos.*;
import com.apartment.repo.UserRepository;
import com.apartment.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final UserRepository users;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest r) { return auth.register(r); }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }

    @GetMapping("/me")
    public Map<String,Object> me(Principal p) {
        User u = users.findByEmail(p.getName()).orElseThrow();
        return Map.of(
                "id", u.getId(), "email", u.getEmail(), "fullName", u.getFullName(),
                "role", u.getRole(), "orgId", u.getOrgId() == null ? 0 : u.getOrgId(),
                "googleConnected", Boolean.TRUE.equals(u.getGoogleConnected()));
    }
}
