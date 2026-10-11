package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long orgId;
    @Column(unique=true, nullable=false) private String email;
    private String passwordHash;
    @Column(nullable=false) private String fullName;
    private String phone;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Role role;
    @Column(columnDefinition="TEXT") private String googleRefreshToken;
    private Boolean googleConnected = false;
    private Instant lastLoginAt;
    private Instant createdAt = Instant.now();

    public enum Role { SUPERADMIN, OWNER, MANAGER, ACCOUNTANT, TENANT }
}
