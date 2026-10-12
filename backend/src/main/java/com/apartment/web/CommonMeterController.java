package com.apartment.web;

import com.apartment.domain.CommonMeterReading;
import com.apartment.dto.AuthDtos.CommonMeterReadingRequest;
import com.apartment.repo.ApartmentRepository;
import com.apartment.security.AuthDetails;
import com.apartment.service.CommonMeterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/owner/common-meter")
@RequiredArgsConstructor
public class CommonMeterController {

    private final CommonMeterService service;
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
    public List<CommonMeterReading> list(@RequestParam(required = false) Integer year,
                                         @RequestParam(required = false) String month) {
        Long aptId = requireApartmentId();
        if (year != null && month != null) return service.byMonth(aptId, year, month);
        return service.forApartment(aptId);
    }

    @PostMapping
    public CommonMeterReading create(@Valid @RequestBody CommonMeterReadingRequest r) {
        return service.upsert(requireApartmentId(), ctx().userId(), r);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(requireApartmentId(), id);
    }
}
