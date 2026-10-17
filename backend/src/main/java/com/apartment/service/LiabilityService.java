package com.apartment.service;

import com.apartment.domain.LiabilitySettlement;
import com.apartment.domain.Tenancy;
import com.apartment.dto.AuthDtos.LiabilitySettleRequest;
import com.apartment.repo.FlatRepository;
import com.apartment.repo.LiabilitySettlementRepository;
import com.apartment.repo.TenancyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Refundable liabilities held by the owner against a tenancy:
 *  - SECURITY_DEPOSIT : refundable at vacate.
 *  - LEASE_UPFRONT    : one-time lease advance/premium, repayable/refundable.
 * Neither is rent income. Both show as an outstanding payable balance.
 */
@Service
@RequiredArgsConstructor
public class LiabilityService {

    private final TenancyRepository tenancies;
    private final FlatRepository flats;
    private final LiabilitySettlementRepository settlements;

    private static BigDecimal nz(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }

    /** Outstanding (unsettled) amount for one tenancy, both kinds combined. */
    private BigDecimal settledFor(Long tenancyId, LiabilitySettlement.Kind kind) {
        return settlements.findByTenancyIdOrderBySettledDateDescIdDesc(tenancyId).stream()
                .filter(s -> s.getKind() == kind)
                .map(s -> nz(s.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<String, Object> rowFor(Tenancy t) {
        BigDecimal deposit = nz(t.getSecurityDeposit());
        BigDecimal depositRefunded = nz(t.getDepositRefunded());
        BigDecimal depositSettled = settledFor(t.getId(), LiabilitySettlement.Kind.SECURITY_DEPOSIT);
        BigDecimal depositOutstanding = deposit.subtract(depositRefunded).subtract(depositSettled);

        BigDecimal upfront = nz(t.getLeaseUpfrontAmount());
        BigDecimal upfrontCollected = nz(t.getLeaseUpfrontCollected());
        BigDecimal upfrontSettled = settledFor(t.getId(), LiabilitySettlement.Kind.LEASE_UPFRONT);
        // Only what has actually been collected is a liability the owner holds.
        BigDecimal upfrontOutstanding = upfrontCollected.subtract(upfrontSettled);

        var flat = flats.findById(t.getFlatId()).orElse(null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tenancyId", t.getId());
        out.put("apartmentId", t.getApartmentId());
        out.put("flatId", t.getFlatId());
        out.put("flatNo", flat != null ? flat.getFlatNo() : null);
        out.put("tenantName", t.getTenantName());
        out.put("tenancyType", t.getTenancyType());
        out.put("active", t.getActive());

        out.put("securityDeposit", deposit);
        out.put("depositRefunded", depositRefunded);
        out.put("depositSettled", depositSettled);
        out.put("depositOutstanding", depositOutstanding);

        out.put("leaseUpfrontAmount", upfront);
        out.put("leaseUpfrontCollected", upfrontCollected);
        out.put("leaseUpfrontSettled", upfrontSettled);
        out.put("leaseUpfrontOutstanding", upfrontOutstanding);
        out.put("leaseUpfrontNotes", t.getLeaseUpfrontNotes());

        out.put("totalOutstanding", depositOutstanding.add(upfrontOutstanding));
        return out;
    }

    /** All tenancies in an apartment with their liability balances. */
    public Map<String, Object> overview(Long aptId, boolean activeOnly) {
        List<Tenancy> all = tenancies.findAll().stream()
                .filter(t -> aptId.equals(t.getApartmentId()))
                .filter(t -> !activeOnly || Boolean.TRUE.equals(t.getActive()))
                .toList();
        List<Map<String, Object>> rows = new ArrayList<>();
        BigDecimal totalDeposit = BigDecimal.ZERO, totalUpfront = BigDecimal.ZERO, total = BigDecimal.ZERO;
        for (Tenancy t : all) {
            Map<String, Object> row = rowFor(t);
            rows.add(row);
            totalDeposit = totalDeposit.add((BigDecimal) row.get("depositOutstanding"));
            totalUpfront = totalUpfront.add((BigDecimal) row.get("leaseUpfrontOutstanding"));
            total = total.add((BigDecimal) row.get("totalOutstanding"));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("rows", rows);
        out.put("totalDepositOutstanding", totalDeposit);
        out.put("totalLeaseUpfrontOutstanding", totalUpfront);
        out.put("totalOutstanding", total);
        return out;
    }

    /** Settle (refund/repay) an amount against a tenancy's liability. */
    @Transactional
    public LiabilitySettlement settle(Long aptId, Long tenancyId, LiabilitySettleRequest r) {
        Tenancy t = tenancies.findById(tenancyId)
                .orElseThrow(() -> new IllegalArgumentException("Tenancy not found"));
        if (!t.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Tenancy not in this apartment");
        if (r.amount() == null || r.amount().signum() <= 0)
            throw new IllegalArgumentException("Amount must be positive");

        LiabilitySettlement.Kind kind = parseKind(r.kind());
        LiabilitySettlement s = LiabilitySettlement.builder()
                .tenancyId(tenancyId)
                .apartmentId(aptId)
                .kind(kind)
                .amount(r.amount())
                .settledDate(r.settledDate() != null ? r.settledDate() : LocalDate.now())
                .notes(r.notes())
                .reason(r.reason())
                .build();
        settlements.save(s);

        // Mirror into the tenancy's own running total so deposit refunds stay visible
        // on existing screens that read depositRefunded.
        if (kind == LiabilitySettlement.Kind.SECURITY_DEPOSIT) {
            t.setDepositRefunded(nz(t.getDepositRefunded()).add(r.amount()));
            tenancies.save(t);
        }
        return s;
    }

    public List<LiabilitySettlement> history(Long aptId, Long tenancyId) {
        Tenancy t = tenancies.findById(tenancyId)
                .orElseThrow(() -> new IllegalArgumentException("Tenancy not found"));
        if (!t.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Tenancy not in this apartment");
        return settlements.findByTenancyIdOrderBySettledDateDescIdDesc(tenancyId);
    }

    private LiabilitySettlement.Kind parseKind(String s) {
        if (s == null || s.isBlank()) return LiabilitySettlement.Kind.SECURITY_DEPOSIT;
        try { return LiabilitySettlement.Kind.valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return LiabilitySettlement.Kind.SECURITY_DEPOSIT; }
    }
}
