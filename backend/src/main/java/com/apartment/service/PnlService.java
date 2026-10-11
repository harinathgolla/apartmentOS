package com.apartment.service;
import com.apartment.domain.*;
import com.apartment.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service @RequiredArgsConstructor
public class PnlService {
    private final ApartmentRepository apartments;
    private final RentRecordRepository rents;
    private final ExpenseRepository expenses;

    public PnlDto compute(Long apartmentId, int year) {
        Apartment apt = apartments.findById(apartmentId).orElseThrow();
        List<RentRecord> rs = rents.findByApartmentIdAndYear(apartmentId, year);
        List<Expense> es = expenses.findByApartmentIdAndYear(apartmentId, year);

        BigDecimal grossRent = rs.stream().map(RentRecord::getRentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal otherIncome = rs.stream()
                .map(r -> nz(r.getEbillAmount()).add(nz(r.getWaterBill())).add(nz(r.getMaintenanceCharge())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal opex = es.stream().map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal emiInterest = rs.stream().map(RentRecord::getEmiInterest)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal noi = grossRent.add(otherIncome).subtract(opex).subtract(emiInterest);
        BigDecimal invested = apt.getPurchaseValue() == null ? BigDecimal.ZERO : apt.getPurchaseValue();
        BigDecimal roi = invested.signum() > 0
                ? noi.multiply(BigDecimal.valueOf(100)).divide(invested, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new PnlDto(year, grossRent, otherIncome, opex, emiInterest, noi, roi, invested);
    }

    private BigDecimal nz(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }

    public record PnlDto(int year, BigDecimal grossRent, BigDecimal otherIncome,
                         BigDecimal operatingExpenses, BigDecimal emiInterest,
                         BigDecimal netOperatingIncome, BigDecimal roiPercent,
                         BigDecimal investedCapital) {}
}
