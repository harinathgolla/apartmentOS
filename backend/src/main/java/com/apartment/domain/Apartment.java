package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name="apartments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Apartment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long orgId;
    private String name;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private Integer totalFloors;
    private BigDecimal purchaseValue;
    private LocalDate purchaseDate;
    private BigDecimal loanAmount;
    private BigDecimal loanEmi;
    private BigDecimal loanInterestRate;
    private Instant createdAt = Instant.now();
}
