package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="rent_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RentRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long tenancyId;
    private Long flatId;
    private Long apartmentId;
    private String tenantName;
    private String month;
    private Integer year;
    @Builder.Default private BigDecimal rentAmount = BigDecimal.ZERO;
    @Builder.Default private BigDecimal ebillAmount = BigDecimal.ZERO;
    @Builder.Default private BigDecimal waterBill = BigDecimal.ZERO;
    @Builder.Default private BigDecimal maintenanceCharge = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalCollected = BigDecimal.ZERO;
    @Builder.Default private BigDecimal houseMaid = BigDecimal.ZERO;
    @Builder.Default private BigDecimal garbageVehicle = BigDecimal.ZERO;
    @Builder.Default private BigDecimal generatorDiesel = BigDecimal.ZERO;
    @Builder.Default private BigDecimal sharedEbill = BigDecimal.ZERO;
    @Builder.Default private BigDecimal emiInterest = BigDecimal.ZERO;
    @Builder.Default private BigDecimal propertyTax = BigDecimal.ZERO;
    @Builder.Default private BigDecimal insurance = BigDecimal.ZERO;
    @Builder.Default private BigDecimal repairs = BigDecimal.ZERO;
    @Builder.Default private BigDecimal otherExpenses = BigDecimal.ZERO;
    @Builder.Default private BigDecimal returnsAmount = BigDecimal.ZERO;
    private BigDecimal netIncome;
    private BigDecimal cumulativeTotal;
    @Enumerated(EnumType.STRING)
    private PaymentMode paymentMode;
    @Builder.Default private Boolean paid = false;
    private LocalDate paidDate;
    private String remarks;
    private Instant createdAt = Instant.now();

    public enum PaymentMode { CASH, UPI, BANK_TRANSFER, CHEQUE, ONLINE }
}