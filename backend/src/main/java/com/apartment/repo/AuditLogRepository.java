package com.apartment.repo;
import com.apartment.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByOrgIdOrderByCreatedAtDescIdDesc(Long orgId, Pageable pageable);
    Page<AuditLog> findByOrgIdAndEntityOrderByCreatedAtDescIdDesc(Long orgId, String entity, Pageable pageable);
    List<AuditLog> findTop100ByOrgIdOrderByCreatedAtDescIdDesc(Long orgId);
}
