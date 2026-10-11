package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="invoices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private Long flatId;
    private Long tenancyId;
    @Column(unique=true) private String invoiceNo;
    private String kind;
    private String month;
    private Integer year;
    @Column(columnDefinition="TEXT") private String lineItems;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal total;
    private String status = "DRAFT";
    private LocalDate dueDate;
    private Instant paidAt;
    private String pdfUrl;
    private Instant createdAt = Instant.now();
}
