package com.apartment.service;
import com.apartment.domain.MeterReading;
import com.apartment.dto.AuthDtos.MeterReadingRequest;
import com.apartment.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class MeterService {
    private final MeterReadingRepository repo;
    private final FlatRepository flats;

    public MeterReading upsert(Long aptId, MeterReadingRequest r) {
        var f = flats.findById(r.flatId()).orElseThrow();
        if (!f.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Flat mismatch");

        MeterReading m = repo.findByFlatIdAndYearAndMonth(r.flatId(), r.year(), r.month())
                .orElseGet(() -> MeterReading.builder()
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
    public MeterReading markPaid(Long aptId, Long id, boolean paid) {
        MeterReading m = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found"));
        if (!m.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Not your apartment");
        m.setPaid(paid);
        m.setPaidDate(paid ? LocalDate.now() : null);
        return repo.save(m);
    }

    public List<MeterReading> byMonth(Long aptId, Integer year, String month) {
        return repo.findByApartmentIdAndYearAndMonth(aptId, year, month);
    }
    public List<MeterReading> byFlat(Long flatId) { return repo.findByFlatIdOrderByYearDescIdDesc(flatId); }
}
