package com.apartment.web;

import com.apartment.domain.WaterReading;
import com.apartment.dto.AuthDtos.WaterReadingRequest;
import com.apartment.repo.ApartmentRepository;
import com.apartment.security.AuthDetails;
import com.apartment.service.WaterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/owner/water")
@RequiredArgsConstructor
public class WaterController {

    private final WaterService service;
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
    public List<WaterReading> list(@RequestParam Integer year, @RequestParam String month) {
        return service.byMonth(requireApartmentId(), year, month);
    }

    @PostMapping
    public WaterReading create(@Valid @RequestBody WaterReadingRequest r) {
        return service.upsert(requireApartmentId(), r);
    }

    @PostMapping("/{id}/paid")
    public WaterReading markPaid(@PathVariable Long id, @RequestParam boolean paid) {
        return service.markPaid(requireApartmentId(), id, paid);
    }
}
