package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name="common_meter_readings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CommonMeterReading {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private String label;
    private Integer year;
    private String month;
    @Builder.Default private BigDecimal previousReading = BigDecimal.ZERO;
    @Builder.Default private BigDecimal presentReading = BigDecimal.ZERO;
    private BigDecimal usageUnits;
    private BigDecimal ratePerUnit;
    private BigDecimal billAmount;
    @Builder.Default private Boolean recoverFromTenants = false;
    private Long expenseId;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
