package com.apartment.service;

import com.apartment.domain.Apartment;
import com.apartment.domain.Flat;
import com.apartment.dto.AuthDtos.ApartmentRequest;
import com.apartment.dto.AuthDtos.FlatRequest;
import com.apartment.repo.ApartmentRepository;
import com.apartment.repo.FlatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ApartmentService {

    private final ApartmentRepository apartments;
    private final FlatRepository flats;

    @Transactional
    public Apartment create(Long orgId, ApartmentRequest r) {
        return apartments.save(Apartment.builder()
                .orgId(orgId)
                .name(r.name())
                .address(r.address())
                .city(r.city())
                .state(r.state())
                .pincode(r.pincode())
                .totalFloors(r.totalFloors())
                .purchaseValue(r.purchaseValue())
                .purchaseDate(r.purchaseDate())
                .loanAmount(r.loanAmount())
                .loanEmi(r.loanEmi())
                .loanInterestRate(r.loanInterestRate())
                .build());
    }

    public List<Apartment> forOrg(Long orgId) {
        return apartments.findByOrgId(orgId);
    }

    public Apartment getById(Long id, Long orgId) {
        Apartment a = apartments.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));
        if (!a.getOrgId().equals(orgId))
            throw new IllegalArgumentException("Not your apartment");
        return a;
    }

    @Transactional
    public Apartment update(Long id, Long orgId, ApartmentRequest r) {
        Apartment a = getById(id, orgId);
        a.setName(r.name());
        a.setAddress(r.address());
        a.setCity(r.city());
        a.setState(r.state());
        a.setPincode(r.pincode());
        a.setTotalFloors(r.totalFloors());
        a.setPurchaseValue(r.purchaseValue());
        a.setPurchaseDate(r.purchaseDate());
        a.setLoanAmount(r.loanAmount());
        a.setLoanEmi(r.loanEmi());
        a.setLoanInterestRate(r.loanInterestRate());
        return apartments.save(a);
    }

    @Transactional
    public void delete(Long id, Long orgId) {
        Apartment a = getById(id, orgId);
        List<Flat> existing = flats.findByApartmentId(id);
        if (!existing.isEmpty()) {
            throw new IllegalStateException(
                    "Cannot delete apartment — it has " + existing.size() + " flat(s). Remove flats first.");
        }
        apartments.delete(a);
    }

    @Transactional
    public Flat addFlat(Long aptId, FlatRequest r) {
        return flats.save(Flat.builder()
                .apartmentId(aptId)
                .flatNo(r.flatNo())
                .floor(r.floor())
                .meterSerialNo(r.meterSerialNo())
                .ownerName(r.ownerName())
                .ownerPhone(r.ownerPhone())
                .areaSqft(r.areaSqft())
                .bedrooms(r.bedrooms())
                .build());
    }

    public List<Flat> flats(Long aptId) {
        return flats.findByApartmentId(aptId);
    }
}