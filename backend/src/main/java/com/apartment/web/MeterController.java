package com.apartment.web;
import com.apartment.domain.Meter;
import com.apartment.dto.AuthDtos.MeterRequest;
import com.apartment.security.AuthDetails;
import com.apartment.service.MeterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/owner/meters")
@RequiredArgsConstructor
public class MeterController {
    private final MeterService meterSvc;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }

    @GetMapping
    public List<Meter> list(@RequestParam Long apartmentId) {
        return meterSvc.listMeters(apartmentId);
    }

    @PostMapping
    public Meter create(@RequestParam Long apartmentId, @Valid @RequestBody MeterRequest r) {
        return meterSvc.createMeter(apartmentId, r);
    }

    @PutMapping("/{id}")
    public Meter update(@RequestParam Long apartmentId, @PathVariable Long id,
                        @Valid @RequestBody MeterRequest r) {
        return meterSvc.updateMeter(apartmentId, id, r);
    }

    @DeleteMapping("/{id}")
    public void delete(@RequestParam Long apartmentId, @PathVariable Long id) {
        meterSvc.deleteMeter(apartmentId, id);
    }
}
