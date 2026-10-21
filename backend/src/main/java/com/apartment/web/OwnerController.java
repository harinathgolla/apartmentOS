package com.apartment.web;
import com.apartment.domain.*;
import com.apartment.dto.AuthDtos.*;
import com.apartment.repo.*;
import com.apartment.security.AuthDetails;
import com.apartment.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/owner")
@RequiredArgsConstructor
public class OwnerController {
    private final ApartmentService aptSvc;
    private final TenantService tenantSvc;
    private final RentService rentSvc;
    private final MeterService meterSvc;
    private final ExpenseService expenseSvc;
    private final ReminderService reminderSvc;
    private final ApartmentRepository apartments;
    private final DeletionService deletionSvc;
    private final AuditService auditSvc;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }
    private Long orgId() { return ctx().orgId(); }

    private Long primaryApartmentIdOrNull() {
        var list = apartments.findByOrgId(orgId());
        return list.isEmpty() ? null : list.get(0).getId();
    }
    private Long requireApartmentId() {
        Long id = primaryApartmentIdOrNull();
        if (id == null) throw new IllegalStateException("Create an apartment first");
        return id;
    }

    /* ─────────── Apartments ─────────── */
    @PostMapping("/apartments")
    public Apartment createApartment(@Valid @RequestBody ApartmentRequest r) {
        return aptSvc.create(orgId(), r);
    }

    @GetMapping("/apartments")
    public List<Apartment> myApartments() { return aptSvc.forOrg(orgId()); }

    @GetMapping("/apartments/{id}")
    public Apartment getApartment(@PathVariable Long id) { return aptSvc.getById(id, orgId()); }

    @PutMapping("/apartments/{id}")
    public Apartment updateApartment(@PathVariable Long id, @Valid @RequestBody ApartmentRequest r) {
        return aptSvc.update(id, orgId(), r);
    }

    @DeleteMapping("/apartments/{id}")
    public Map<String, Object> deleteApartment(@PathVariable Long id,
                                               @RequestParam(defaultValue = "false") boolean cascade) {
        return deletionSvc.deleteApartment(ctx(), id, cascade);
    }

    /** Preview of what a cascade delete would remove. */
    @GetMapping("/apartments/{id}/delete-impact")
    public Map<String, Object> apartmentDeleteImpact(@PathVariable Long id) {
        aptSvc.getById(id, orgId());
        return deletionSvc.apartmentImpact(id);
    }

    /* ─────────── Flats ─────────── */
    @PostMapping("/apartments/{aptId}/flats")
    public Flat addFlat(@PathVariable Long aptId, @Valid @RequestBody FlatRequest r) {
        return aptSvc.addFlat(aptId, r);
    }

    @PutMapping("/apartments/{aptId}/flats/{flatId}")
    public Flat updateFlat(@PathVariable Long aptId, @PathVariable Long flatId,
                           @Valid @RequestBody FlatRequest r) {
        return aptSvc.updateFlat(aptId, flatId, r);
    }

    @DeleteMapping("/apartments/{aptId}/flats/{flatId}")
    public Map<String, Object> deleteFlat(@PathVariable Long aptId, @PathVariable Long flatId,
                                          @RequestParam(defaultValue = "false") boolean cascade) {
        return deletionSvc.deleteFlat(ctx(), aptId, flatId, cascade);
    }

    @GetMapping("/apartments/{aptId}/flats/{flatId}/delete-impact")
    public Map<String, Object> flatDeleteImpact(@PathVariable Long aptId, @PathVariable Long flatId) {
        return deletionSvc.flatImpact(aptId, flatId);
    }

    /** List flats. If apartmentId is omitted, uses the primary (first) apartment. */
    @GetMapping("/flats")
    public List<Flat> flats(@RequestParam(required = false) Long apartmentId) {
        Long aptId = apartmentId != null ? apartmentId : primaryApartmentIdOrNull();
        return aptId == null ? List.of() : aptSvc.flats(aptId);
    }

    /* ─────────── Tenants ─────────── */
    @PostMapping("/tenants")
    public Tenancy onboard(@Valid @RequestBody TenantRequest r) {
        Tenancy t = tenantSvc.onboard(orgId(), r);
        auditSvc.record(ctx(), "Tenancy", t.getId(), "CREATE", null, t);
        return t;
    }

    /** By default, returns active tenants. Pass ?all=true to include inactive ones. */
    /** status = active (default) | inactive | all */
    @GetMapping("/tenants")
    public org.springframework.data.domain.Page<Tenancy> tenants(
            @RequestParam(required = false) Long apartmentId,
            @RequestParam(required = false, defaultValue = "false") boolean all,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Long aptId = apartmentId != null ? apartmentId : primaryApartmentIdOrNull();
        if (aptId == null) return org.springframework.data.domain.Page.empty();
        String s = status != null ? status : (all ? "all" : "active");
        return switch (s) {
            case "inactive" -> tenantSvc.pageInactive(aptId, page, size);
            case "all" -> tenantSvc.pageAll(aptId, page, size);
            default -> tenantSvc.pageActive(aptId, page, size);
        };
    }

    @GetMapping("/tenants/{id}")
    public Tenancy getTenant(@PathVariable Long id) { return tenantSvc.getById(id, orgId()); }

    @PutMapping("/tenants/{id}")
    public Tenancy updateTenant(@PathVariable Long id, @RequestBody TenantUpdateRequest r) {
        Tenancy before = tenantSvc.getById(id, orgId());
        Tenancy after = tenantSvc.update(id, orgId(), r);
        auditSvc.record(ctx(), "Tenancy", id, "UPDATE", before, after);
        return after;
    }

    @PostMapping("/tenants/{id}/deactivate")
    public Tenancy deactivateTenant(@PathVariable Long id) { return tenantSvc.deactivate(id, orgId()); }

    @DeleteMapping("/tenants/{id}")
    public Map<String, Object> deleteTenant(@PathVariable Long id,
                                            @RequestParam(defaultValue = "false") boolean cascade) {
        Tenancy t = tenantSvc.getById(id, orgId());
        return deletionSvc.deleteTenancy(ctx(), t.getApartmentId(), id, cascade);
    }

    /** Vacate with an optional deposit deduction — kept as audit history. */
    @PostMapping("/tenants/{id}/vacate")
    public Tenancy vacateTenant(@PathVariable Long id, @RequestBody(required = false) VacateRequest r) {
        Tenancy before = tenantSvc.getById(id, orgId());
        Tenancy after = (r == null)
                ? tenantSvc.vacate(id, orgId(), null, null, null)
                : tenantSvc.vacate(id, orgId(), r.vacateDate(), r.deductionAmount(), r.deductionReason());
        auditSvc.record(ctx(), "Tenancy", id, "VACATE", before, after);
        return after;
    }

    @PostMapping("/tenants/{id}/reactivate")
    public Tenancy reactivateTenant(@PathVariable Long id) { return tenantSvc.reactivate(id, orgId()); }

    /* ─────────── Rent ─────────── */
    @GetMapping("/rent")
    public List<RentRecord> rentByMonth(@RequestParam Integer year, @RequestParam String month,
                                        @RequestParam(required = false) Long apartmentId) {
        Long aptId = apartmentId != null ? apartmentId : primaryApartmentIdOrNull();
        return aptId == null ? List.of() : rentSvc.byMonth(aptId, year, month);
    }

    /** Record a rent payment for one tenant. */
    @PostMapping("/rent/collect")
    public RentRecord collect(@Valid @RequestBody CollectRentRequest r) {
        RentRecord rec = rentSvc.collect(requireApartmentId(), r);
        auditSvc.record(ctx(), "RentRecord", rec.getId(), "COLLECT", null, rec);
        return rec;
    }

    /** Bulk-collect: mark a set of tenancies (or all active) as paid for the month. */
    @PostMapping("/rent/bulk-collect")
    public Map<String, Object> bulkCollect(@Valid @RequestBody BulkCollectRequest r) {
        return rentSvc.bulkCollect(requireApartmentId(), r);
    }

    /** Delete a single rent record. */
    @DeleteMapping("/rent/{id}")
    public Map<String, Object> deleteRentRecord(@PathVariable Long id) {
        return deletionSvc.deleteRentRecord(ctx(), requireApartmentId(), id);
    }

    /** Owner-facing maintenance coverage: maintenance collected vs common-area outgo. */
    @GetMapping("/rent/maintenance-coverage")
    public Map<String, Object> maintenanceCoverage(@RequestParam Integer year,
                                                   @RequestParam String month) {
        return rentSvc.maintenanceCoverage(requireApartmentId(), year, month);
    }

    /* ─────────── Electricity ─────────── */
    @PostMapping("/meter")
    public MeterReading upsertMeter(@Valid @RequestBody MeterReadingRequest r) {
        return meterSvc.upsert(requireApartmentId(), r);
    }
    @GetMapping("/meter")
    public List<MeterReading> meterByMonth(@RequestParam Integer year, @RequestParam String month) {
        Long aptId = primaryApartmentIdOrNull();
        return aptId == null ? List.of() : meterSvc.byMonth(aptId, year, month);
    }

    /** Toggle the paid/unpaid status of a meter reading. */
    @PostMapping("/meter/{id}/paid")
    public MeterReading markMeterPaid(@PathVariable Long id, @RequestParam boolean paid) {
        return meterSvc.markPaid(requireApartmentId(), id, paid);
    }

    /* ─────────── Expenses ─────────── */
    @PostMapping("/expenses")
    public Expense addExpense(@Valid @RequestBody ExpenseRequest r) {
        Long aptId = requireApartmentId();
        var req = new ExpenseRequest(aptId, r.category(), r.subcategory(),
                r.amount(), r.expenseDate(), r.vendor(), r.invoiceNo(), r.notes());
        return expenseSvc.create(ctx().userId(), req);
    }
    @GetMapping("/expenses")
    public org.springframework.data.domain.Page<Expense> expenses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Long aptId = primaryApartmentIdOrNull();
        if (aptId == null) return org.springframework.data.domain.Page.empty();
        return expenseSvc.pageForApartment(aptId, page, size);
    }

    /* ─────────── Dashboard ─────────── */
    @GetMapping("/summary")
    public Map<String, Object> summary() {
        Long aptId = primaryApartmentIdOrNull();
        if (aptId == null) {
            return Map.of("hasApartment", false, "tenants", 0,
                    "collectedThisMonth", BigDecimal.ZERO,
                    "pending", BigDecimal.ZERO,
                    "unitsThisMonth", BigDecimal.ZERO);
        }
        var month = LocalDate.now().getMonth().name();
        int year = LocalDate.now().getYear();
        var rents = rentSvc.byMonth(aptId, year, month);
        var meters = meterSvc.byMonth(aptId, year, month);
        BigDecimal collected = rents.stream().map(RentRecord::getTotalCollected)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pending = rents.stream().filter(r -> !Boolean.TRUE.equals(r.getPaid()))
                .map(RentRecord::getTotalCollected).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal units = meters.stream().map(MeterReading::getUsageUnits)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of(
                "hasApartment", true,
                "apartmentId", aptId,
                "tenants", tenantSvc.active(aptId).size(),
                "collectedThisMonth", collected,
                "pending", pending,
                "unitsThisMonth", units);
    }

    @GetMapping("/trend")
    public List<Map<String, Object>> trend(@RequestParam(defaultValue = "6") int months) {
        Long aptId = primaryApartmentIdOrNull();
        List<Map<String, Object>> out = new ArrayList<>();
        LocalDate d = LocalDate.now().minusMonths(months - 1L);
        for (int i = 0; i < months; i++) {
            var m = d.getMonth().name();
            int y = d.getYear();
            BigDecimal income = BigDecimal.ZERO, expense = BigDecimal.ZERO;
            if (aptId != null) {
                var recs = rentSvc.byMonth(aptId, y, m);
                income = recs.stream().map(RentRecord::getTotalCollected)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                expense = recs.stream().map(r ->
                        nz(r.getHouseMaid()).add(nz(r.getGarbageVehicle()))
                        .add(nz(r.getGeneratorDiesel())).add(nz(r.getSharedEbill())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
            out.add(Map.of("month", m.substring(0, 3), "income", income, "expense", expense));
            d = d.plusMonths(1);
        }
        return out;
    }

    private BigDecimal nz(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }

    /* ─────────── Reminders ─────────── */
    @PostMapping("/reminders/send")
    public Map<String, Object> send(@RequestBody ReminderRequest r) {
        Long aptId = requireApartmentId();
        Long ownerId = ctx().userId();
        List<Tenancy> targets = tenantSvc.active(aptId);
        int sent = 0, failed = 0;
        for (Tenancy t : targets) {
            try {
                reminderSvc.sendRentReminder(ownerId, aptId, t.getId(), r.month(), r.year(), r.customMessage());
                sent++;
            } catch (Exception e) { failed++; }
        }
        return Map.of("sent", sent, "failed", failed);
    }
}