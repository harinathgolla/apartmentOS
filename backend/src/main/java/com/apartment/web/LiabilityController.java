package com.apartment.web;

import com.apartment.domain.LiabilitySettlement;
import com.apartment.dto.AuthDtos.LiabilitySettleRequest;
import com.apartment.repo.ApartmentRepository;
import com.apartment.security.AuthDetails;
import com.apartment.service.LiabilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/liabilities")
@RequiredArgsConstructor
public class LiabilityController {

    private final LiabilityService liabilitySvc;
    private final ApartmentRepository apartments;
    private final com.apartment.service.AuditService auditSvc;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }

    private Long requireApartmentId(Long apartmentId) {
        if (apartmentId != null) return apartmentId;
        var list = apartments.findByOrgId(ctx().orgId());
        if (list.isEmpty()) throw new IllegalStateException("Create an apartment first");
        return list.get(0).getId();
    }

    /** Outstanding refundable liabilities (security deposit + lease upfront) per tenancy. */
    @GetMapping
    public Map<String, Object> overview(@RequestParam(required = false) Long apartmentId,
                                        @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        return liabilitySvc.overview(requireApartmentId(apartmentId), activeOnly);
    }

    /** Record a refund/repayment against a tenancy liability. */
    @PostMapping("/tenancy/{tenancyId}/settle")
    public LiabilitySettlement settle(@PathVariable Long tenancyId,
                                      @RequestParam(required = false) Long apartmentId,
                                      @Valid @RequestBody LiabilitySettleRequest r) {
        var s = liabilitySvc.settle(requireApartmentId(apartmentId), tenancyId, r);
        auditSvc.record(ctx(), "LiabilitySettlement", s.getId(), "SETTLE", null, s);
        return s;
    }

    /** Settlement history for one tenancy. */
    @GetMapping("/tenancy/{tenancyId}/history")
    public org.springframework.data.domain.Page<LiabilitySettlement> history(
            @PathVariable Long tenancyId,
            @RequestParam(required = false) Long apartmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return liabilitySvc.pageHistory(requireApartmentId(apartmentId), tenancyId, page, size);
    }
}
