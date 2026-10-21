package com.apartment.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Value("${app.frontend.url}") String front) {
        CorsConfiguration c = new CorsConfiguration();
        // "http://localhost:*" requires an explicit port, so it does NOT match the
        // bare origin http://localhost (port 80, as served through nginx). List it
        // explicitly so both the dev (:3000) and prod (:80) origins are allowed.
        c.setAllowedOriginPatterns(List.of(front, "http://localhost", "http://localhost:*"));
        c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}
