package com.apartment.service;

import com.apartment.domain.*;
import com.apartment.repo.*;
import com.apartment.security.AuthDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Hard-cascade deletion with an explicit two-step contract.
 *
 * Step 1 (dry run): callers ask for the impact; if dependents exist we throw an
 * IllegalStateException whose message enumerates exactly what would be removed.
 * The exception is returned as HTTP 409 by GlobalExceptionHandler.
 *
 * Step 2 (cascade=true): the same tree is deleted in FK-safe order inside one
 * transaction, then audited.
 *
 * Deletion order is child-first:
 *   liability_settlements -> rent_records -> meter_readings -> water_readings
 *   -> meters -> common_meter_readings -> utility_bills -> expenses
 *   -> reminders -> tenancies -> flats
 */
@Service
@RequiredArgsConstructor
public class DeletionService {

    private final ApartmentRepository apartments;
    private final FlatRepository flats;
    private final TenancyRepository tenancies;
    private final RentRecordRepository rentRecords;
    private final MeterRepository meters;
    private final MeterReadingRepository meterReadings;
    private final WaterReadingRepository waterReadings;
    private final CommonMeterReadingRepository commonMeters;
    private final UtilityBillRepository utilityBills;
    private final ExpenseRepository expenses;
    private final ReminderRepository reminders;
    private final LiabilitySettlementRepository settlements;
    private final AuditService audit;

    /* ─────────── impact computation ─────────── */

    /** Counts of everything that would be removed when deleting a flat. */
    public Map<String, Object> flatImpact(Long aptId, Long flatId) {
        Flat f = requireFlat(aptId, flatId);
        List<Tenancy> ts = tenancies.findAll().stream()
                .filter(t -> flatId.equals(t.getFlatId())).toList();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("flat", f.getFlatNo());
        m.put("tenancies", ts.size());
        m.put("rentRecords", ts.stream().mapToInt(t -> rentRecords.findByTenancyIdOrderByYearDescIdDesc(t.getId()).size()).sum());
        m.put("liabilitySettlements", ts.stream().mapToInt(t -> settlements.findByTenancyIdOrderBySettledDateDescIdDesc(t.getId()).size()).sum());
        m.put("meterReadings", meterReadings.findByFlatIdOrderByYearDescIdDesc(flatId).size());
        m.put("waterReadings", waterReadings.findByFlatIdOrderByYearDescIdDesc(flatId).size());
        m.put("meters", meters.findByApartmentIdAndFlatId(aptId, flatId).size());
        return m;
    }

    /** Counts of everything that would be removed when deleting an apartment. */
    public Map<String, Object> apartmentImpact(Long aptId) {
        List<Flat> fs = flats.findByApartmentId(aptId);
        List<Tenancy> ts = tenancies.findAll().stream()
                .filter(t -> aptId.equals(t.getApartmentId())).toList();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("flats", fs.size());
        m.put("tenancies", ts.size());
        m.put("rentRecords", rentRecords.findByApartmentIdOrderByYearDescIdDesc(aptId).size());
        m.put("meterReadings", meterReadings.findByApartmentIdAndYearAndMonth(aptId, java.time.LocalDate.now().getYear(), "__none__").size()
                + countAllMeterReadings(aptId));
        m.put("meters", meters.findByApartmentId(aptId).size());
        m.put("commonMeterReadings", commonMeters.findByApartmentIdOrderByYearDescIdDesc(aptId).size());
        m.put("utilityBills", utilityBills.findByApartmentIdOrderByBillDateDesc(aptId).size());
        m.put("expenses", expenses.findByApartmentIdOrderByExpenseDateDesc(aptId).size());
        m.put("reminders", reminders.findByApartmentIdOrderBySentAtDesc(aptId).size());
        m.put("liabilitySettlements", settlements.findByApartmentIdOrderBySettledDateDescIdDesc(aptId).size());
        return m;
    }

    private int countAllMeterReadings(Long aptId) {
        // findByApartmentIdAndYearAndMonth needs a real month; count via flat scan instead.
        int n = 0;
        for (Flat f : flats.findByApartmentId(aptId)) {
            n += meterReadings.findByFlatIdOrderByYearDescIdDesc(f.getId()).size();
        }
        return n;
    }

    private boolean hasDependents(Map<String, Object> impact) {
        return impact.entrySet().stream()
                .filter(e -> e.getValue() instanceof Integer)
                .anyMatch(e -> ((Integer) e.getValue()) > 0);
    }

    /* ─────────── flat deletion ─────────── */

    @Transactional
    public Map<String, Object> deleteFlat(AuthDetails ctx, Long aptId, Long flatId, boolean cascade) {
        Flat f = requireFlat(aptId, flatId);
        Map<String, Object> impact = flatImpact(aptId, flatId);

        if (!cascade && hasDependents(impact)) {
            throw new IllegalStateException(dependentMessage("Flat " + f.getFlatNo(), impact));
        }

        List<Tenancy> ts = tenancies.findAll().stream()
                .filter(t -> flatId.equals(t.getFlatId())).toList();

        for (Tenancy t : ts) {
            settlements.deleteAll(settlements.findByTenancyIdOrderBySettledDateDescIdDesc(t.getId()));
            rentRecords.deleteAll(rentRecords.findByTenancyIdOrderByYearDescIdDesc(t.getId()));
        }
        meterReadings.deleteAll(meterReadings.findByFlatIdOrderByYearDescIdDesc(flatId));
        waterReadings.deleteAll(waterReadings.findByFlatIdOrderByYearDescIdDesc(flatId));
        meters.deleteAll(meters.findByApartmentIdAndFlatId(aptId, flatId));
        tenancies.deleteAll(ts);

        flats.delete(f);

        audit.record(ctx, "Flat", flatId, "DELETE_CASCADE", impact, null);
        return Map.of("deleted", true, "flat", f.getFlatNo(), "removed", impact);
    }

    /* ─────────── apartment deletion ─────────── */

    @Transactional
    public Map<String, Object> deleteApartment(AuthDetails ctx, Long aptId, boolean cascade) {
        Apartment a = apartments.findById(aptId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));
        if (!a.getOrgId().equals(ctx.orgId()))
            throw new IllegalArgumentException("Not your apartment");

        Map<String, Object> impact = apartmentImpact(aptId);
        if (!cascade && hasDependents(impact)) {
            throw new IllegalStateException(dependentMessage("Apartment " + a.getName(), impact));
        }

        List<Tenancy> ts = tenancies.findAll().stream()
                .filter(t -> aptId.equals(t.getApartmentId())).toList();
        List<Flat> fs = flats.findByApartmentId(aptId);

        // child-first
        settlements.deleteAll(settlements.findByApartmentIdOrderBySettledDateDescIdDesc(aptId));
        for (Tenancy t : ts) rentRecords.deleteAll(rentRecords.findByTenancyIdOrderByYearDescIdDesc(t.getId()));
        for (Flat f : fs) {
            meterReadings.deleteAll(meterReadings.findByFlatIdOrderByYearDescIdDesc(f.getId()));
            waterReadings.deleteAll(waterReadings.findByFlatIdOrderByYearDescIdDesc(f.getId()));
        }
        meters.deleteAll(meters.findByApartmentId(aptId));
        commonMeters.deleteAll(commonMeters.findByApartmentIdOrderByYearDescIdDesc(aptId));
        utilityBills.deleteAll(utilityBills.findByApartmentIdOrderByBillDateDesc(aptId));
        expenses.deleteAll(expenses.findByApartmentIdOrderByExpenseDateDesc(aptId));
        reminders.deleteAll(reminders.findByApartmentIdOrderBySentAtDesc(aptId));
        tenancies.deleteAll(ts);
        flats.deleteAll(fs);

        apartments.delete(a);

        audit.record(ctx, "Apartment", aptId, "DELETE_CASCADE", impact, null);
        return Map.of("deleted", true, "apartment", a.getName(), "removed", impact);
    }

    /* ─────────── tenancy deletion ─────────── */

    @Transactional
    public Map<String, Object> deleteTenancy(AuthDetails ctx, Long aptId, Long tenancyId, boolean cascade) {
        Tenancy t = tenancies.findById(tenancyId)
                .orElseThrow(() -> new IllegalArgumentException("Tenancy not found"));
        if (!t.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Tenancy not in this apartment");

        Map<String, Object> impact = new LinkedHashMap<>();
        impact.put("tenant", t.getTenantName());
        impact.put("rentRecords", rentRecords.findByTenancyIdOrderByYearDescIdDesc(tenancyId).size());
        impact.put("liabilitySettlements", settlements.findByTenancyIdOrderBySettledDateDescIdDesc(tenancyId).size());

        if (!cascade && hasDependents(impact)) {
            throw new IllegalStateException(dependentMessage("Tenant " + t.getTenantName(), impact));
        }

        settlements.deleteAll(settlements.findByTenancyIdOrderBySettledDateDescIdDesc(tenancyId));
        rentRecords.deleteAll(rentRecords.findByTenancyIdOrderByYearDescIdDesc(tenancyId));
        tenancies.delete(t);

        audit.record(ctx, "Tenancy", tenancyId, "DELETE_CASCADE", impact, null);
        return Map.of("deleted", true, "tenant", t.getTenantName(), "removed", impact);
    }

    /* ─────────── rent record deletion ─────────── */

    @Transactional
    public Map<String, Object> deleteRentRecord(AuthDetails ctx, Long aptId, Long recordId) {
        RentRecord r = rentRecords.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Rent record not found"));
        if (!r.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Record not in this apartment");

        Map<String, Object> before = new LinkedHashMap<>();
        before.put("tenant", r.getTenantName());
        before.put("month", r.getMonth());
        before.put("year", r.getYear());
        before.put("totalCollected", r.getTotalCollected());

        rentRecords.delete(r);
        audit.record(ctx, "RentRecord", recordId, "DELETE", before, null);
        return Map.of("deleted", true);
    }

    /* ─────────── utility bill deletion ─────────── */

    @Transactional
    public Map<String, Object> deleteUtilityBill(AuthDetails ctx, Long aptId, Long billId) {
        UtilityBill b = utilityBills.findById(billId)
                .orElseThrow(() -> new IllegalArgumentException("Bill not found"));
        if (!b.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Bill not in this apartment");

        Map<String, Object> before = new LinkedHashMap<>();
        before.put("category", b.getCategory());
        before.put("amount", b.getAmount());
        before.put("billDate", String.valueOf(b.getBillDate()));

        utilityBills.delete(b);
        audit.record(ctx, "UtilityBill", billId, "DELETE", before, null);
        return Map.of("deleted", true);
    }

    /* ─────────── helpers ─────────── */

    private Flat requireFlat(Long aptId, Long flatId) {
        Flat f = flats.findById(flatId)
                .orElseThrow(() -> new IllegalArgumentException("Flat not found"));
        if (!f.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Flat not in this apartment");
        return f;
    }

    private String dependentMessage(String label, Map<String, Object> impact) {
        List<String> parts = new ArrayList<>();
        impact.forEach((k, v) -> {
            if (v instanceof Integer && (Integer) v > 0 && !"flat".equals(k)
                    && !"tenant".equals(k) && !"apartment".equals(k)) {
                parts.add(v + " " + k);
            }
        });
        return label + " has dependent records: " + String.join(", ", parts)
                + ". Deleting will permanently remove all of them. Re-send with cascade=true to confirm.";
    }
}
