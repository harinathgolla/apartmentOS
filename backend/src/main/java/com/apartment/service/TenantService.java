package com.apartment.service;

import com.apartment.domain.Flat;
import com.apartment.domain.Tenancy;
import com.apartment.domain.User;
import com.apartment.dto.AuthDtos.TenantRequest;
import com.apartment.dto.AuthDtos.TenantUpdateRequest;
import com.apartment.repo.FlatRepository;
import com.apartment.repo.TenancyRepository;
import com.apartment.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenancyRepository tenancies;
    private final UserRepository users;
    private final FlatRepository flats;
    private final PasswordEncoder encoder;

    @Transactional
    public Tenancy onboard(Long orgId, TenantRequest r) {
        Flat f = flats.findById(r.flatId())
                .orElseThrow(() -> new IllegalArgumentException("Flat not found"));
        Long aptId = f.getApartmentId();

        Long tenantUserId = null;
        if (r.tenantEmail() != null && !r.tenantEmail().isBlank()) {
            User u = users.findByEmail(r.tenantEmail()).orElseGet(() -> users.save(
                    User.builder()
                            .email(r.tenantEmail())
                            .passwordHash(encoder.encode("tenant@123"))
                            .fullName(r.tenantName())
                            .phone(r.tenantPhone())
                            .role(User.Role.TENANT)
                            .orgId(orgId)
                            .build()));
            tenantUserId = u.getId();
        }

        tenancies.findByFlatIdAndActiveTrue(r.flatId()).forEach(t -> {
            t.setActive(false);
            tenancies.save(t);
        });

        Tenancy.Frequency freq = parseFrequency(r.frequency());
        Tenancy.TenancyType type = parseTenancyType(r.tenancyType());

        // RENTAL agreements default to an 11-month term from the start date.
        // LEASE terms are owner-entered (3/5 years etc.) and left as supplied.
        java.time.LocalDate start = r.startDate();
        java.time.LocalDate end = r.endDate();
        if (start != null && end == null && type == Tenancy.TenancyType.RENTAL) {
            end = start.plusMonths(11);
        }

        Tenancy t = Tenancy.builder()
                .flatId(r.flatId())
                .apartmentId(aptId)
                .tenantUserId(tenantUserId)
                .tenantName(r.tenantName())
                .tenantPhone(r.tenantPhone())
                .tenantEmail(r.tenantEmail())
                .rentAmount(r.rentAmount())
                .securityDeposit(r.securityDeposit())
                .agreementStart(start)
                .agreementEnd(end)
                .frequency(freq)
                .dueDay(r.dueDay() != null ? r.dueDay() : 5)
                .tenancyType(type)
                .maintenanceAmount(r.maintenanceAmount() != null ? r.maintenanceAmount() : java.math.BigDecimal.ZERO)
                .leaseUpfrontAmount(r.leaseUpfrontAmount() != null ? r.leaseUpfrontAmount() : java.math.BigDecimal.ZERO)
                .leaseUpfrontCollected(r.leaseUpfrontCollected() != null ? r.leaseUpfrontCollected() : java.math.BigDecimal.ZERO)
                .leaseUpfrontNotes(r.leaseUpfrontNotes())
                .active(true)
                .build();
        return tenancies.save(t);
    }

    public List<Tenancy> active(Long aptId) {
        return tenancies.findByApartmentIdAndActiveTrue(aptId);
    }

    public List<Tenancy> allForApartment(Long aptId) {
        return tenancies.findAll().stream()
                .filter(t -> aptId.equals(t.getApartmentId()))
                .sorted((a, b) -> Boolean.compare(Boolean.TRUE.equals(b.getActive()),
                                                  Boolean.TRUE.equals(a.getActive())))
                .toList();
    }

    public Tenancy getById(Long id, Long orgId) {
        return tenancies.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenancy not found"));
    }

    @Transactional
    public Tenancy update(Long id, Long orgId, TenantUpdateRequest r) {
        Tenancy t = getById(id, orgId);
        if (r.tenantName() != null && !r.tenantName().isBlank()) t.setTenantName(r.tenantName());
        if (r.tenantPhone() != null) t.setTenantPhone(r.tenantPhone());
        if (r.tenantEmail() != null) t.setTenantEmail(r.tenantEmail());
        if (r.rentAmount() != null) t.setRentAmount(r.rentAmount());
        if (r.securityDeposit() != null) t.setSecurityDeposit(r.securityDeposit());
        if (r.startDate() != null) t.setAgreementStart(r.startDate());
        if (r.endDate() != null) t.setAgreementEnd(r.endDate());
        // RENTAL with a start but no explicit end: default to an 11-month term.
        if (r.startDate() != null && r.endDate() == null
                && t.getTenancyType() == Tenancy.TenancyType.RENTAL
                && t.getAgreementEnd() == null) {
            t.setAgreementEnd(r.startDate().plusMonths(11));
        }
        if (r.active() != null) t.setActive(r.active());
        if (r.frequency() != null) t.setFrequency(parseFrequency(r.frequency()));
        if (r.dueDay() != null) t.setDueDay(r.dueDay());
        if (r.tenancyType() != null) t.setTenancyType(parseTenancyType(r.tenancyType()));
        if (r.maintenanceAmount() != null) t.setMaintenanceAmount(r.maintenanceAmount());
        // Nominal override written back to the flat (item 5).
        if (r.nominalElectricityAmount() != null || r.nominalWaterAmount() != null) {
            flats.findById(t.getFlatId()).ifPresent(f -> {
                if (r.nominalElectricityAmount() != null) f.setNominalElectricityAmount(r.nominalElectricityAmount());
                if (r.nominalWaterAmount() != null) f.setNominalWaterAmount(r.nominalWaterAmount());
                flats.save(f);
            });
        }
        if (r.leaseUpfrontAmount() != null) t.setLeaseUpfrontAmount(r.leaseUpfrontAmount());
        if (r.leaseUpfrontCollected() != null) t.setLeaseUpfrontCollected(r.leaseUpfrontCollected());
        if (r.leaseUpfrontNotes() != null) t.setLeaseUpfrontNotes(r.leaseUpfrontNotes());
        return tenancies.save(t);
    }

    /**
     * Vacate a tenancy with an optional deposit deduction (damages/painting/etc.).
     * The deduction is audit data — it stays on the tenancy forever so a future
     * reactivation or a returning tenant has full history.
     */
    @Transactional
    public Tenancy vacate(Long id, Long orgId, java.time.LocalDate vacateDate,
                          java.math.BigDecimal deductionAmount, String deductionReason) {
        Tenancy t = getById(id, orgId);
        t.setActive(false);
        if (vacateDate != null) t.setVacateDate(vacateDate);
        else if (t.getVacateDate() == null) t.setVacateDate(java.time.LocalDate.now());

        if (deductionAmount != null && deductionAmount.signum() > 0) {
            java.math.BigDecimal existing = t.getDeductionAmount() == null
                    ? java.math.BigDecimal.ZERO : t.getDeductionAmount();
            t.setDeductionAmount(existing.add(deductionAmount));
            t.setDeductionReason(deductionReason);
            t.setDeductedAt(java.time.Instant.now());
        }
        return tenancies.save(t);
    }

    @Transactional
    public Tenancy deactivate(Long id, Long orgId) {
        return vacate(id, orgId, null, null, null);
    }

    @Transactional
    public Tenancy reactivate(Long id, Long orgId) {
        Tenancy t = getById(id, orgId);
        List<Tenancy> activeOnFlat = tenancies.findByFlatIdAndActiveTrue(t.getFlatId());
        if (activeOnFlat.stream().anyMatch(x -> !x.getId().equals(t.getId()))) {
            throw new IllegalStateException("Another tenant is already active on this flat.");
        }
        t.setActive(true);
        return tenancies.save(t);
    }

    private Tenancy.Frequency parseFrequency(String s) {
        if (s == null || s.isBlank()) return Tenancy.Frequency.MONTHLY;
        try { return Tenancy.Frequency.valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return Tenancy.Frequency.MONTHLY; }
    }

    private Tenancy.TenancyType parseTenancyType(String s) {
        if (s == null || s.isBlank()) return Tenancy.TenancyType.RENTAL;
        try { return Tenancy.TenancyType.valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return Tenancy.TenancyType.RENTAL; }
    }
}