package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name="water_readings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WaterReading {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long flatId;
    private Long meterId;
    private Long apartmentId;
    private Integer year;
    private String month;
    @Builder.Default private BigDecimal previousReading = BigDecimal.ZERO;
    @Builder.Default private BigDecimal presentReading = BigDecimal.ZERO;
    private BigDecimal usageUnits;
    private BigDecimal ratePerUnit;
    private BigDecimal billAmount;
    @Builder.Default private Boolean paid = false;
    private LocalDate paidDate;
    private LocalDate readingDate;
}
