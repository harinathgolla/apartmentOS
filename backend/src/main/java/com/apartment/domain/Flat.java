package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="flats")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Flat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private String flatNo;
    private Integer floor;
    private BigDecimal areaSqft;
    private Integer bedrooms;
    private String meterSerialNo;
    private String ownerName;
    private String ownerPhone;
    private BigDecimal ownerSharePct;
    private BigDecimal nominalElectricityAmount;
    private BigDecimal nominalWaterAmount;
}
