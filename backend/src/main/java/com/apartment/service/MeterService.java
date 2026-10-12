package com.apartment.service;
import com.apartment.domain.Meter;
import com.apartment.domain.MeterReading;
import com.apartment.dto.AuthDtos.MeterRequest;
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
    private final MeterRepository meters;
    private final FlatRepository flats;

    /* ─────────── Meter master CRUD ─────────── */

    @Transactional
    public Meter createMeter(Long aptId, MeterRequest r) {
        if (r.flatId() != null) {
            var f = flats.findById(r.flatId()).orElseThrow();
            if (!f.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Flat mismatch");
        }
        Meter m = Meter.builder()
                .apartmentId(aptId)
                .flatId(r.flatId())
                .label(r.label())
                .serialNo(r.serialNo())
                .utilityType(parseUtilityType(r.utilityType()))
                .scope(r.scope() != null ? parseScope(r.scope()) : Meter.Scope.PRIVATE)
                .ratePerUnit(r.ratePerUnit())
                .active(r.active() == null || r.active())
                .build();
        return meters.save(m);
    }

    @Transactional
    public Meter updateMeter(Long aptId, Long id, MeterRequest r) {
        Meter m = meters.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Meter not found"));
        if (!m.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Not your apartment");
        if (r.flatId() != null) {
            var f = flats.findById(r.flatId()).orElseThrow();
            if (!f.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Flat mismatch");
            m.setFlatId(r.flatId());
        }
        if (r.label() != null) m.setLabel(r.label());
        if (r.serialNo() != null) m.setSerialNo(r.serialNo());
        if (r.utilityType() != null) m.setUtilityType(parseUtilityType(r.utilityType()));
        if (r.scope() != null) m.setScope(parseScope(r.scope()));
        if (r.ratePerUnit() != null) m.setRatePerUnit(r.ratePerUnit());
        if (r.active() != null) m.setActive(r.active());
        return meters.save(m);
    }

    public List<Meter> listMeters(Long aptId) { return meters.findByApartmentId(aptId); }

    @Transactional
    public void deleteMeter(Long aptId, Long id) {
        Meter m = meters.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Meter not found"));
        if (!m.getApartmentId().equals(aptId)) throw new IllegalArgumentException("Not your apartment");
        meters.delete(m);
    }

    /* ─────────── Readings ─────────── */

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
        if (r.meterId() != null) {
            Meter meter = meters.findById(r.meterId()).orElse(null);
            if (meter != null && meter.getApartmentId().equals(aptId)) m.setMeterId(meter.getId());
        }
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

    /** Resolve the effective scope of a flat's electricity meter (defaults PRIVATE if unmapped). */
    public Meter.Scope scopeForFlat(Long flatId, Meter.UtilityType utilityType) {
        return meters.findByFlatIdAndUtilityType(flatId, utilityType)
                .map(Meter::getScope)
                .orElse(Meter.Scope.PRIVATE);
    }

    /* ─────────── helpers ─────────── */
    private Meter.UtilityType parseUtilityType(String s) {
        if (s == null || s.isBlank()) return Meter.UtilityType.ELECTRICITY;
        try { return Meter.UtilityType.valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return Meter.UtilityType.ELECTRICITY; }
    }
    private Meter.Scope parseScope(String s) {
        if (s == null || s.isBlank()) return Meter.Scope.PRIVATE;
        try { return Meter.Scope.valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return Meter.Scope.PRIVATE; }
    }
}
