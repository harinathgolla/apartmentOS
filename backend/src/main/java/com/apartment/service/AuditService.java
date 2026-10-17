package com.apartment.service;

import com.apartment.domain.AuditLog;
import com.apartment.repo.AuditLogRepository;
import com.apartment.security.AuthDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Records every mutating owner action.
 *
 * Uses REQUIRES_NEW so an audit row survives even if the caller's business
 * transaction rolls back — a failed delete attempt is itself worth auditing.
 * Serialization failures are swallowed (logged) so auditing can never break
 * the primary operation.
 *
 * Note: Jackson is NOT a project dependency (only jjwt-jackson and gson are),
 * so snapshots are built with a tiny reflective map instead of ObjectMapper.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuthDetails ctx, String entity, Long entityId, String action,
                       Object before, Object after) {
        try {
            AuditLog row = AuditLog.builder()
                    .orgId(ctx != null ? ctx.orgId() : null)
                    .userId(ctx != null ? ctx.userId() : null)
                    .entity(entity)
                    .entityId(entityId)
                    .action(action)
                    .beforeJson(toJson(before))
                    .afterJson(toJson(after))
                    .build();
            repo.save(row);
        } catch (Exception e) {
            log.warn("Audit write failed for {}#{} {}: {}", entity, entityId, action, e.getMessage());
        }
    }

    public Page<AuditLog> page(Long orgId, String entity, int page, int size) {
        var pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return (entity == null || entity.isBlank())
                ? repo.findByOrgIdOrderByCreatedAtDescIdDesc(orgId, pr)
                : repo.findByOrgIdAndEntityOrderByCreatedAtDescIdDesc(orgId, entity, pr);
    }

    /** Reflective shallow snapshot — enough for an audit trail, no deps. */
    private String toJson(Object o) {
        if (o == null) return null;
        try {
            if (o instanceof Map<?, ?> m) return mapToJson(m);
            Map<String, Object> flat = new LinkedHashMap<>();
            for (Field f : o.getClass().getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) continue;
                f.setAccessible(true);
                Object v = f.get(o);
                if (v instanceof Collection<?> || v instanceof Map<?, ?>) continue;
                flat.put(f.getName(), v == null ? null : String.valueOf(v));
            }
            return mapToJson(flat);
        } catch (Exception e) {
            return String.valueOf(o);
        }
    }

    private String mapToJson(Map<?, ?> m) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<?, ?> e : m.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append('"').append(esc(e.getKey())).append("\":");
            Object v = e.getValue();
            if (v == null) sb.append("null");
            else sb.append('"').append(esc(v)).append('"');
        }
        return sb.append('}').toString();
    }

    private String esc(Object v) {
        return String.valueOf(v).replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
