package com.apartment.service;

import com.apartment.domain.RentRecord;
import com.apartment.domain.Tenancy;
import com.apartment.dto.AuthDtos.BulkCollectRequest;
import com.apartment.dto.AuthDtos.CollectRentRequest;
import com.apartment.repo.RentRecordRepository;
import com.apartment.repo.TenancyRepository;
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
        if (r.ebillAmount() != null) rec.setEbillAmount(r.ebillAmount());
        if (r.waterBill() != null) rec.setWaterBill(r.waterBill());
        if (r.maintenanceCharge() != null) rec.setMaintenanceCharge(r.maintenanceCharge());
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
            rec.setPaid(true);
            rec.setPaidDate(LocalDate.now());
            rec.setPaymentMode(mode);
            recalc(rec);
            repo.save(rec);
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
}