package com.apartment.service;

import com.apartment.domain.Meter;
import com.apartment.domain.RentRecord;
import com.apartment.domain.Tenancy;
import com.apartment.dto.AuthDtos.BulkCollectRequest;
import com.apartment.dto.AuthDtos.CollectRentRequest;
import com.apartment.repo.CommonMeterReadingRepository;
import com.apartment.repo.ExpenseRepository;
import com.apartment.repo.FlatRepository;
import com.apartment.repo.MeterReadingRepository;
import com.apartment.repo.MeterRepository;
import com.apartment.repo.RentRecordRepository;
import com.apartment.repo.TenancyRepository;
import com.apartment.repo.WaterReadingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RentService {

    private final RentRecordRepository repo;
    private final TenancyRepository tenancies;
    private final MeterRepository meters;
    private final CommonMeterReadingRepository commonMeters;
    private final ExpenseRepository expenses;
    private final FlatRepository flats;
    private final MeterReadingRepository meterReadings;
    private final WaterReadingRepository waterReadings;

    /**
     * PRIVATE-meter utilities are collected by the owner; PUBLIC-meter utilities are paid
     * by the tenant directly and therefore EXCLUDED from rent collection line items.
     * A flat with no electricity/water meter mapped is treated as PRIVATE (owner collects).
     */
    private boolean isPublic(Long flatId, Meter.UtilityType type) {
        if (flatId == null) return false;
        return meters.findByFlatIdAndUtilityType(flatId, type)
                .map(m -> m.getScope() == Meter.Scope.PUBLIC)
                .orElse(false);
    }



    /**
     * When a flat has NO meter mapped for a utility, fall back to its nominal fixed charge.
     * Returns null when a meter exists (reading-driven) or no nominal amount is configured.
     */
    private BigDecimal nominalFor(Long flatId, Meter.UtilityType type) {
        if (flatId == null) return null;
        if (meters.findByFlatIdAndUtilityType(flatId, type).isPresent()) return null;
        return flats.findById(flatId).map(fl ->
                type == Meter.UtilityType.ELECTRICITY
                        ? fl.getNominalElectricityAmount()
                        : fl.getNominalWaterAmount())
                .orElse(null);
    }

    /**
     * True when the flat is billed by a fixed nominal amount for this utility.
     * In that case meter readings are irrelevant and must NOT leak into rent collection.
     */
    private boolean usesNominal(Long flatId, Meter.UtilityType type) {
        return nominalFor(flatId, type) != null;
    }

    /** Bill amount from the recorded meter reading for the period, or null if none. */
    private BigDecimal readingBill(Long flatId, Integer year, String month, Meter.UtilityType type) {
        if (flatId == null) return null;
        if (type == Meter.UtilityType.ELECTRICITY) {
            return meterReadings.findByFlatIdAndYearAndMonth(flatId, year, month)
                    .map(r -> r.getBillAmount()).orElse(null);
        }
        return waterReadings.findByFlatIdAndYearAndMonth(flatId, year, month)
                .map(r -> r.getBillAmount()).orElse(null);
    }

    /** Records a rent payment — creates or updates the record and marks it paid. */
    @Transactional
    public RentRecord collect(Long aptId, CollectRentRequest r) {
        Tenancy t = tenancies.findById(r.tenancyId())
                .orElseThrow(() -> new IllegalArgumentException("Tenancy not found"));
        if (!t.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Tenancy not in this apartment");

        RentRecord rec = repo.findByTenancyIdAndYearAndMonth(r.tenancyId(), r.year(), r.month())
                .orElseGet(() -> RentRecord.builder()
                        .tenancyId(r.tenancyId()).flatId(t.getFlatId())
                        .apartmentId(aptId).month(r.month()).year(r.year())
                        .tenantName(t.getTenantName()).build());

        // Pre-fill rent from tenancy if not passed
        BigDecimal rent = r.rentAmount() != null ? r.rentAmount() : t.getRentAmount();
        rec.setTenantName(t.getTenantName());
        rec.setRentAmount(nz(rent));
        // Electricity: nominal flat charge wins; otherwise reading bill; otherwise what was passed.
        if (usesNominal(t.getFlatId(), Meter.UtilityType.ELECTRICITY)) {
            rec.setEbillAmount(nz(nominalFor(t.getFlatId(), Meter.UtilityType.ELECTRICITY)));
        } else if (isPublic(t.getFlatId(), Meter.UtilityType.ELECTRICITY)) {
            rec.setEbillAmount(BigDecimal.ZERO);
        } else if (r.ebillAmount() != null) {
            rec.setEbillAmount(r.ebillAmount());
        } else {
            BigDecimal fromReading = readingBill(t.getFlatId(), r.year(), r.month(), Meter.UtilityType.ELECTRICITY);
            if (fromReading != null) rec.setEbillAmount(fromReading);
        }

        // Water: same precedence.
        if (usesNominal(t.getFlatId(), Meter.UtilityType.WATER)) {
            rec.setWaterBill(nz(nominalFor(t.getFlatId(), Meter.UtilityType.WATER)));
        } else if (isPublic(t.getFlatId(), Meter.UtilityType.WATER)) {
            rec.setWaterBill(BigDecimal.ZERO);
        } else if (r.waterBill() != null) {
            rec.setWaterBill(r.waterBill());
        } else {
            BigDecimal fromReading = readingBill(t.getFlatId(), r.year(), r.month(), Meter.UtilityType.WATER);
            if (fromReading != null) rec.setWaterBill(fromReading);
        }

        // Keep meter reading paid-status in sync with the collection.
        syncReadingPaid(t.getFlatId(), r.year(), r.month(), rec);
        if (r.maintenanceCharge() != null) rec.setMaintenanceCharge(r.maintenanceCharge());
        else if (t.getMaintenanceAmount() != null
                && (rec.getMaintenanceCharge() == null || rec.getMaintenanceCharge().signum() == 0))
            rec.setMaintenanceCharge(t.getMaintenanceAmount());
        rec.setPaid(true);
        rec.setPaidDate(r.paidDate() != null ? r.paidDate() : LocalDate.now());
        rec.setPaymentMode(parseMode(r.paymentMode()));
        if (r.remarks() != null) rec.setRemarks(r.remarks());
        recalc(rec);
        return repo.save(rec);
    }

    /** Bulk collect — creates/updates + marks paid for a set of tenancies (or all active). */
    @Transactional
    public Map<String, Object> bulkCollect(Long aptId, BulkCollectRequest r) {
        List<Tenancy> targets;
        if (r.tenancyIds() != null && !r.tenancyIds().isEmpty()) {
            targets = r.tenancyIds().stream()
                    .map(id -> tenancies.findById(id).orElse(null))
                    .filter(Objects::nonNull)
                    .filter(t -> aptId.equals(t.getApartmentId()))
                    .toList();
        } else {
            targets = tenancies.findByApartmentIdAndActiveTrue(aptId);
        }

        RentRecord.PaymentMode mode = parseMode(r.paymentMode());
        int collected = 0;
        for (Tenancy t : targets) {
            RentRecord rec = repo.findByTenancyIdAndYearAndMonth(t.getId(), r.year(), r.month())
                    .orElseGet(() -> RentRecord.builder()
                            .tenancyId(t.getId()).flatId(t.getFlatId())
                            .apartmentId(aptId).month(r.month()).year(r.year())
                            .tenantName(t.getTenantName()).build());
            rec.setTenantName(t.getTenantName());
            if (rec.getRentAmount() == null || rec.getRentAmount().signum() == 0) {
                rec.setRentAmount(nz(t.getRentAmount()));
            }
            // Maintenance is fixed by the agreement — never let bulk-collect drift from it.
            if (t.getMaintenanceAmount() != null && t.getMaintenanceAmount().signum() > 0) {
                rec.setMaintenanceCharge(t.getMaintenanceAmount());
            }
            // Utility lines: nominal wins, else the recorded reading bill.
            if (usesNominal(t.getFlatId(), Meter.UtilityType.ELECTRICITY)) {
                rec.setEbillAmount(nz(nominalFor(t.getFlatId(), Meter.UtilityType.ELECTRICITY)));
            } else if (!isPublic(t.getFlatId(), Meter.UtilityType.ELECTRICITY)) {
                BigDecimal e = readingBill(t.getFlatId(), r.year(), r.month(), Meter.UtilityType.ELECTRICITY);
                if (e != null) rec.setEbillAmount(e);
            }
            if (usesNominal(t.getFlatId(), Meter.UtilityType.WATER)) {
                rec.setWaterBill(nz(nominalFor(t.getFlatId(), Meter.UtilityType.WATER)));
            } else if (!isPublic(t.getFlatId(), Meter.UtilityType.WATER)) {
                BigDecimal w = readingBill(t.getFlatId(), r.year(), r.month(), Meter.UtilityType.WATER);
                if (w != null) rec.setWaterBill(w);
            }
            rec.setPaid(true);
            rec.setPaidDate(LocalDate.now());
            rec.setPaymentMode(mode);
            recalc(rec);
            repo.save(rec);
            syncReadingPaid(t.getFlatId(), r.year(), r.month(), rec);
            collected++;
        }
        return Map.of("collected", collected, "month", r.month(), "year", r.year());
    }

    public List<RentRecord> byMonth(Long aptId, Integer year, String month) {
        return repo.findByApartmentIdAndYearAndMonth(aptId, year, month);
    }

    public List<RentRecord> forTenant(Long tenancyId) {
        return repo.findByTenancyIdOrderByYearDescIdDesc(tenancyId);
    }

    public List<RentRecord> forApartmentYear(Long aptId, Integer year) {
        return repo.findByApartmentIdAndYear(aptId, year);
    }

    /* ─── helpers ─── */

    /**
     * When rent is collected, mark the matching meter/water reading paid so the
     * Meters/Electricity screens reflect collection status. Nominal flats have no
     * reading to sync.
     */
    private void syncReadingPaid(Long flatId, Integer year, String month, RentRecord rec) {
        if (flatId == null) return;
        boolean paid = Boolean.TRUE.equals(rec.getPaid());
        LocalDate paidDate = rec.getPaidDate();
        if (!usesNominal(flatId, Meter.UtilityType.ELECTRICITY)) {
            meterReadings.findByFlatIdAndYearAndMonth(flatId, year, month).ifPresent(m -> {
                m.setPaid(paid);
                m.setPaidDate(paid ? paidDate : null);
                meterReadings.save(m);
            });
        }
        if (!usesNominal(flatId, Meter.UtilityType.WATER)) {
            waterReadings.findByFlatIdAndYearAndMonth(flatId, year, month).ifPresent(m -> {
                m.setPaid(paid);
                m.setPaidDate(paid ? paidDate : null);
                waterReadings.save(m);
            });
        }
    }

    private void recalc(RentRecord rec) {
        // Tenant-side charges only — these are what the tenant pays to the owner.
        BigDecimal collected = nz(rec.getRentAmount())
                .add(nz(rec.getEbillAmount()))
                .add(nz(rec.getWaterBill()))
                .add(nz(rec.getMaintenanceCharge()));
        rec.setTotalCollected(collected);
        rec.setNetIncome(collected);
        rec.setCumulativeTotal(collected);
    }

    private BigDecimal nz(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }

    private RentRecord.PaymentMode parseMode(String s) {
        if (s == null || s.isBlank()) return RentRecord.PaymentMode.CASH;
        try { return RentRecord.PaymentMode.valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return RentRecord.PaymentMode.CASH; }
    }

    /**
     * Maintenance coverage for a period: total maintenance expected vs collected,
     * against the common-area / maintenance outgo (common meter + recovery-flagged
     * utility bills). Owner-facing only; never surfaced as a tenant line item.
     */
    public Map<String, Object> maintenanceCoverage(Long aptId, Integer year, String month) {
        var activeTenancies = tenancies.findByApartmentIdAndActiveTrue(aptId);
        BigDecimal expected = activeTenancies.stream()
                .map(t -> nz(t.getMaintenanceAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        var records = repo.findByApartmentIdAndYearAndMonth(aptId, year, month);
        BigDecimal collected = records.stream()
                .map(r -> nz(r.getMaintenanceCharge()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal commonArea = commonMeters
                .findByApartmentIdAndYearAndMonth(aptId, year, month).stream()
                .map(m -> nz(m.getBillAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal maintenanceExpenses = expenses.findByApartmentIdOrderByExpenseDateDesc(aptId).stream()
                .filter(e -> e.getExpenseDate() != null
                        && e.getExpenseDate().getYear() == year
                        && e.getExpenseDate().getMonth().name().equalsIgnoreCase(month))
                .filter(e -> "COMMON_METER".equals(e.getSource())
                        || "UTILITY_BILL".equals(e.getSource())
                        || (e.getCategory() != null && e.getCategory().toUpperCase().contains("MAINT")))
                .map(e -> nz(e.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outgo = commonArea.max(maintenanceExpenses);
        BigDecimal surplus = collected.subtract(outgo);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("month", month);
        out.put("year", year);
        out.put("expected", expected);
        out.put("collected", collected);
        out.put("commonAreaCost", commonArea);
        out.put("maintenanceExpenses", maintenanceExpenses);
        out.put("outgo", outgo);
        out.put("surplus", surplus);
        out.put("covered", surplus.signum() >= 0);
        return out;
    }

}