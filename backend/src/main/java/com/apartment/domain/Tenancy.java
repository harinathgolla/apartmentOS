package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="tenancies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tenancy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long flatId;
    private Long apartmentId;
    private Long tenantUserId;
    private String tenantName;
    private String tenantPhone;
    private String tenantEmail;
    private LocalDate agreementStart;
    private LocalDate agreementEnd;
    private BigDecimal rentAmount;
    private BigDecimal securityDeposit;
    @Builder.Default
    private BigDecimal depositRefunded = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Frequency frequency = Frequency.MONTHLY;
    @Builder.Default
    private Integer dueDay = 5;
    @Builder.Default
    private Boolean active = true;
    private Instant createdAt = Instant.now();

    public enum Frequency { MONTHLY, WEEKLY, DAILY, QUARTERLY, YEARLY }
}