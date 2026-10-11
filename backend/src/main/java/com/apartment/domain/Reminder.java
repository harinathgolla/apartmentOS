package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="reminders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reminder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long apartmentId;
    private Long tenancyId;
    private String recipientEmail;
    private String subject;
    @Column(columnDefinition="TEXT") private String body;
    private String status;
    @Column(columnDefinition="TEXT") private String error;
    private Instant sentAt = Instant.now();
}
