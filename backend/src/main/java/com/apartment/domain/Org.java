package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="orgs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Org {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Column(unique=true, nullable=false) private String slug;
    @Enumerated(EnumType.STRING) private Plan plan = Plan.TRIAL;
    private Instant trialEndsAt;
    private Instant planRenewsAt;
    private String razorpayCustomerId;
    private String razorpaySubscriptionId;
    private String billingEmail;
    private Instant createdAt = Instant.now();

    public enum Plan { TRIAL, STARTER, PRO, ENTERPRISE }
}
