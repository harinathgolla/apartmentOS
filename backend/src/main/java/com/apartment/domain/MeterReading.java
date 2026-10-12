package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name="meter_readings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MeterReading {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long flatId;
    private Long apartmentId;
    private Integer year;
    private String month;
    private BigDecimal previousReading = BigDecimal.ZERO;
    private BigDecimal presentReading = BigDecimal.ZERO;
    private BigDecimal usageUnits;
    private BigDecimal ratePerUnit;
    private BigDecimal billAmount;
    private LocalDate readingDate;
    @Builder.Default private Boolean paid = false;
    private LocalDate paidDate;
}
