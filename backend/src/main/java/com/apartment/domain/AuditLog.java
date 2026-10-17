package com.apartment.domain;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Append-only activity trail. Every mutating owner action writes one row
 * capturing WHO (user_id), for which ORG, on which ENTITY/ENTITY_ID, WHAT
 * (action) and the before/after JSON snapshots.
 *
 * before_json / after_json are CLOB in Liquibase (changeset 012); mapped as
 * TEXT-equivalent via @Lob so Hibernate validate accepts them on MySQL.
 */
@Entity @Table(name="audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long orgId;
    private Long userId;
    private String entity;
    private Long entityId;
    private String action;
    @Lob private String beforeJson;
    @Lob private String afterJson;
    @Builder.Default
    private Instant createdAt = Instant.now();
}
