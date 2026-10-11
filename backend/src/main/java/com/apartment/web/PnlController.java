package com.apartment.web;
import com.apartment.repo.ApartmentRepository;
import com.apartment.security.AuthDetails;
import com.apartment.service.PnlService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/owner/pnl") @RequiredArgsConstructor
public class PnlController {
    private final PnlService pnl;
    private final ApartmentRepository apartments;

    @GetMapping("/{apartmentId}")
    public PnlService.PnlDto pnl(@PathVariable Long apartmentId, @RequestParam int year) {
        return pnl.compute(apartmentId, year);
    }

    @GetMapping
    public PnlService.PnlDto pnlDefault(@RequestParam int year) {
        var d = (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
        var apt = apartments.findByOrgId(d.orgId()).stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No apartment"));
        return pnl.compute(apt.getId(), year);
    }
}
