package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="expenses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Expense {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private String category;
    private String subcategory;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private String vendor;
    private String invoiceNo;
    @Column(columnDefinition="TEXT") private String notes;
    private String receiptUrl;
    private Long createdBy;
    @Builder.Default private String source = "MANUAL";
    private Long sourceRefId;
    private Instant createdAt = Instant.now();
}
