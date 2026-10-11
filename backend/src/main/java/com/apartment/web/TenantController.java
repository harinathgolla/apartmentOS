package com.apartment.web;
import com.apartment.domain.*;
import com.apartment.repo.*;
import com.apartment.security.AuthDetails;
import com.apartment.service.RentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/tenant") @RequiredArgsConstructor
public class TenantController {
    private final TenancyRepository tenancies;
    private final RentService rentSvc;
    private final MeterReadingRepository meters;
    private final FlatRepository flats;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }

    private Tenancy tenancyOrNull() {
        return tenancies.findByTenantUserIdAndActiveTrue(ctx().userId()).orElse(null);
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        Tenancy t = tenancyOrNull();
        if (t == null) {
            return Map.of("hasTenancy", false);
        }
        Flat f = flats.findById(t.getFlatId()).orElse(null);
        return Map.of("hasTenancy", true, "tenancy", t, "flat", f);
    }

    @GetMapping("/rent")
    public List<RentRecord> myRent() {
        Tenancy t = tenancyOrNull();
        return t == null ? List.of() : rentSvc.forTenant(t.getId());
    }

    @GetMapping("/meter")
    public List<MeterReading> myMeter() {
        Tenancy t = tenancyOrNull();
        return t == null ? List.of() : meters.findByFlatIdOrderByYearDescIdDesc(t.getFlatId());
    }
}