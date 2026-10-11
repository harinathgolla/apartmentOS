package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name="payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long invoiceId;
    private Long apartmentId;
    private BigDecimal amount;
    private String mode;
    private String reference;
    private Instant paidAt = Instant.now();
    private Long recordedBy;
}
