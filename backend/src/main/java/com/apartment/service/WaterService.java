package com.apartment.service;
import com.apartment.domain.WaterReading;
import com.apartment.dto.AuthDtos.WaterReadingRequest;
import com.apartment.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class WaterService {
    private final WaterReadingRepository repo;
    private final FlatRepository flats;

    @Transactional
    public WaterReading upsert(Long aptId, WaterReadingRequest r) {
        var f = flats.findById(r.flatId()).orElseThrow();
        if (!f.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Flat mismatch");

        WaterReading m = repo.findByFlatIdAndYearAndMonth(r.flatId(), r.year(), r.month())
                .orElseGet(() -> WaterReading.builder()
                        .flatId(r.flatId()).apartmentId(aptId)
                        .year(r.year()).month(r.month()).build());

        BigDecimal prev = r.previousReading() != null ? r.previousReading() : m.getPreviousReading();
        BigDecimal pres = r.presentReading() != null ? r.presentReading() : BigDecimal.ZERO;
        BigDecimal rate = r.ratePerUnit() != null ? r.ratePerUnit() : BigDecimal.ZERO;
        BigDecimal usage = pres.subtract(prev);
        m.setPreviousReading(prev);
        m.setPresentReading(pres);
        m.setRatePerUnit(rate);
        m.setUsageUnits(usage);
        m.setBillAmount(usage.multiply(rate));
        if (r.paid() != null) {
            m.setPaid(r.paid());
            m.setPaidDate(r.paid() ? LocalDate.now() : null);
        }
        return repo.save(m);
    }

    @Transactional
    public WaterReading markPaid(Long aptId, Long id, boolean paid) {
        WaterReading m = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found"));
        if (!m.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Not your apartment");
        m.setPaid(paid);
        m.setPaidDate(paid ? LocalDate.now() : null);
        return repo.save(m);
    }

    public List<WaterReading> byMonth(Long aptId, Integer year, String month) {
        return repo.findByApartmentIdAndYearAndMonth(aptId, year, month);
    }
    public List<WaterReading> byFlat(Long flatId) { return repo.findByFlatIdOrderByYearDescIdDesc(flatId); }
}
