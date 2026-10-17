package com.apartment.config;
import com.apartment.security.*;
import com.apartment.service.OAuthTokenPersistence;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration @EnableMethodSecurity @RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;
    private final OAuthTokenPersistence oauthSuccess;

    @Bean
    public SecurityFilterChain chain(HttpSecurity http) throws Exception {
        http
          .cors(c -> {})
          .csrf(AbstractHttpConfigurer::disable)
          .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
          .authorizeHttpRequests(a -> a
              .requestMatchers("/api/auth/**", "/api/billing/webhook/**", "/login/**", "/oauth2/**", "/actuator/**").permitAll()
              .requestMatchers("/api/owner/**").hasAnyRole("OWNER","MANAGER")
              .requestMatchers("/api/tenant/**").hasRole("TENANT")
              .anyRequest().authenticated())
          .oauth2Login(o -> o.successHandler(oauthSuccess));
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
