package com.apartment.web;

import com.apartment.domain.UtilityBill;
import com.apartment.dto.AuthDtos.UtilityBillRequest;
import com.apartment.repo.ApartmentRepository;
import com.apartment.security.AuthDetails;
import com.apartment.service.UtilityBillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/utility-bills")
@RequiredArgsConstructor
public class UtilityBillController {

    private final UtilityBillService service;
    private final ApartmentRepository apartments;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }

    private Long requireApartmentId() {
        return apartments.findByOrgId(ctx().orgId()).stream()
                .findFirst()
                .map(a -> a.getId())
                .orElseThrow(() -> new IllegalStateException("Create an apartment first"));
    }

    @GetMapping
    public List<UtilityBill> list() {
        return service.forApartment(requireApartmentId());
    }

    @PostMapping
    public UtilityBill create(@Valid @RequestBody UtilityBillRequest r) {
        return service.create(requireApartmentId(), ctx().userId(), r);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(requireApartmentId(), id);
    }

    /** Suggested per-flat maintenance share from recover-via-maintenance bills for a period. */
    @GetMapping("/maintenance-suggestion")
    public Map<String, Object> maintenanceSuggestion(@RequestParam Integer year,
                                                     @RequestParam(required = false) String month) {
        return Map.of("perFlat", service.maintenanceSuggestion(requireApartmentId(), year, month));
    }
}
