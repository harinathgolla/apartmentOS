package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Meter master — one meter per flat per utility.
 * scope PUBLIC  = tenant pays the utility directly (owner does not collect).
 * scope PRIVATE = owner bills/collects the utility from the tenant.
 */
@Entity @Table(name="meters")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Meter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private Long flatId;
    private String label;
    private String serialNo;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UtilityType utilityType;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Scope scope = Scope.PRIVATE;
    private BigDecimal ratePerUnit;
    @Builder.Default private Boolean active = true;
    private Instant createdAt = Instant.now();

    public enum UtilityType { ELECTRICITY, WATER }
    public enum Scope { PUBLIC, PRIVATE }
}
