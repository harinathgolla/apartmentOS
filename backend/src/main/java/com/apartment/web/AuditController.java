package com.apartment.web;

import com.apartment.domain.AuditLog;
import com.apartment.security.AuthDetails;
import com.apartment.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/owner/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditSvc;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }

    @GetMapping
    public Page<AuditLog> list(@RequestParam(required = false) String entity,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "50") int size) {
        return auditSvc.page(ctx().orgId(), entity, page, size);
    }
}
