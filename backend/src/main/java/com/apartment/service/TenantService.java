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

        Tenancy t = Tenancy.builder()
                .flatId(r.flatId())
                .apartmentId(aptId)
                .tenantUserId(tenantUserId)
                .tenantName(r.tenantName())
                .tenantPhone(r.tenantPhone())
                .tenantEmail(r.tenantEmail())
                .rentAmount(r.rentAmount())
                .securityDeposit(r.securityDeposit())
                .agreementStart(r.startDate())
                .agreementEnd(r.endDate())
                .frequency(freq)
                .dueDay(r.dueDay() != null ? r.dueDay() : 5)
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
        if (r.active() != null) t.setActive(r.active());
        if (r.frequency() != null) t.setFrequency(parseFrequency(r.frequency()));
        if (r.dueDay() != null) t.setDueDay(r.dueDay());
        return tenancies.save(t);
    }

    @Transactional
    public Tenancy deactivate(Long id, Long orgId) {
        Tenancy t = getById(id, orgId);
        t.setActive(false);
        return tenancies.save(t);
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
}