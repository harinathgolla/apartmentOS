package com.apartment.service;

import com.apartment.domain.CommonMeterReading;
import com.apartment.domain.Expense;
import com.apartment.dto.AuthDtos.CommonMeterReadingRequest;
import com.apartment.repo.CommonMeterReadingRepository;
import com.apartment.repo.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommonMeterService {

    private final CommonMeterReadingRepository repo;
    private final ExpenseRepository expenses;

    private BigDecimal nz(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }

    @Transactional
    public CommonMeterReading upsert(Long aptId, Long userId, CommonMeterReadingRequest r) {
        BigDecimal prev = r.previousReading() != null ? r.previousReading() : BigDecimal.ZERO;
        BigDecimal pres = r.presentReading() != null ? r.presentReading() : BigDecimal.ZERO;
        BigDecimal rate = r.ratePerUnit() != null ? r.ratePerUnit() : BigDecimal.ZERO;
        BigDecimal usage = pres.subtract(prev);
        BigDecimal bill = usage.multiply(rate);

        CommonMeterReading m = CommonMeterReading.builder()
                .apartmentId(aptId)
                .label(r.label())
                .year(r.year())
                .month(r.month())
                .previousReading(prev)
                .presentReading(pres)
                .usageUnits(usage)
                .ratePerUnit(rate)
                .billAmount(bill)
                .recoverFromTenants(Boolean.TRUE.equals(r.recoverFromTenants()))
                .createdBy(userId)
                .build();
        m = repo.save(m);

        // Owner pays -> record as an expense
        String notes = "Common area" + (r.label() != null ? " — " + r.label() : "")
                + " (" + r.month() + " " + r.year() + ")";
        Expense e = expenses.save(Expense.builder()
                .apartmentId(aptId)
                .category("ELECTRICITY_COMMON")
                .subcategory(r.label())
                .amount(bill)
                .expenseDate(java.time.LocalDate.now())
                .notes(notes)
                .createdBy(userId)
                .source("COMMON_METER")
                .sourceRefId(m.getId())
                .build());

        m.setExpenseId(e.getId());
        return repo.save(m);
    }

    public List<CommonMeterReading> forApartment(Long aptId) {
        return repo.findByApartmentIdOrderByYearDescIdDesc(aptId);
    }

    public List<CommonMeterReading> byMonth(Long aptId, Integer year, String month) {
        return repo.findByApartmentIdAndYearAndMonth(aptId, year, month);
    }

    @Transactional
    public void delete(Long aptId, Long id) {
        CommonMeterReading m = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found"));
        if (!m.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Not your apartment");
        if (m.getExpenseId() != null) expenses.deleteById(m.getExpenseId());
        repo.delete(m);
    }
}
