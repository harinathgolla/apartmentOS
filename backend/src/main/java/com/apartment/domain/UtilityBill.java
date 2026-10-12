package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="utility_bills")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UtilityBill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private String category;
    private String subcategory;
    private String description;
    private BigDecimal amount;
    private LocalDate billDate;
    private String vendor;
    private String invoiceNo;
    private String periodMonth;
    private Integer periodYear;
    @Builder.Default private Boolean affectsMaintenance = false;
    private Long expenseId;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
