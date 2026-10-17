package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A record of money paid BACK by the owner against a refundable liability
 * (security deposit or lease upfront charge) held on a tenancy.
 * This is never rent — it reduces the outstanding payable balance.
 */
@Entity @Table(name="liability_settlements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LiabilitySettlement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long tenancyId;
    private Long apartmentId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;
    @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
    private LocalDate settledDate;
    private String notes;
    private Instant createdAt = Instant.now();

    public enum Kind { SECURITY_DEPOSIT, LEASE_UPFRONT }
}
