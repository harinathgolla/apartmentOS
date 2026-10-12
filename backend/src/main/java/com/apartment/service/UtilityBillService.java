package com.apartment.service;

import com.apartment.domain.Expense;
import com.apartment.domain.UtilityBill;
import com.apartment.dto.AuthDtos.UtilityBillRequest;
import com.apartment.repo.ExpenseRepository;
import com.apartment.repo.TenancyRepository;
import com.apartment.repo.UtilityBillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UtilityBillService {

    private final UtilityBillRepository repo;
    private final ExpenseRepository expenses;
    private final TenancyRepository tenancies;

    /** Map a utility-bill category to an expense category label. */
    private String expenseCategory(String category) {
        return "UTILITY_" + (category == null ? "OTHER" : category.toUpperCase());
    }

    @Transactional
    public UtilityBill create(Long aptId, Long userId, UtilityBillRequest r) {
        // 1. Persist the bill
        UtilityBill b = repo.save(UtilityBill.builder()
                .apartmentId(aptId)
                .category(r.category())
                .subcategory(r.subcategory())
                .description(r.description())
                .amount(r.amount())
                .billDate(r.billDate())
                .vendor(r.vendor())
                .invoiceNo(r.invoiceNo())
                .periodMonth(r.periodMonth())
                .periodYear(r.periodYear())
                .affectsMaintenance(Boolean.TRUE.equals(r.affectsMaintenance()))
                .createdBy(userId)
                .build());

        // 2. Auto-create a linked Expense
        String notes = buildNotes(b);
        Expense e = expenses.save(Expense.builder()
                .apartmentId(aptId)
                .category(expenseCategory(b.getCategory()))
                .subcategory(b.getSubcategory())
                .amount(b.getAmount())
                .expenseDate(b.getBillDate())
                .vendor(b.getVendor())
                .invoiceNo(b.getInvoiceNo())
                .notes(notes)
                .createdBy(userId)
                .source("UTILITY_BILL")
                .sourceRefId(b.getId())
                .build());

        // 3. Link the expense back onto the bill
        b.setExpenseId(e.getId());
        return repo.save(b);
    }

    public List<UtilityBill> forApartment(Long aptId) {
        return repo.findByApartmentIdOrderByBillDateDesc(aptId);
    }

    @Transactional
    public void delete(Long aptId, Long id) {
        UtilityBill b = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bill not found"));
        if (!b.getApartmentId().equals(aptId))
            throw new IllegalArgumentException("Not your apartment");
        if (b.getExpenseId() != null) expenses.deleteById(b.getExpenseId());
        repo.delete(b);
    }

    /**
     * Suggest a per-flat maintenance share: sum of affects_maintenance bills for the
     * given period, divided by the number of active flats (active tenancies) in the apartment.
     */
    public BigDecimal maintenanceSuggestion(Long aptId, Integer year, String month) {
        int activeFlats = tenancies.findByApartmentIdAndActiveTrue(aptId).size();
        if (activeFlats == 0) return BigDecimal.ZERO;
        BigDecimal total = repo.findByApartmentIdAndPeriodYear(aptId, year).stream()
                .filter(b -> Boolean.TRUE.equals(b.getAffectsMaintenance()))
                .filter(b -> month == null || month.equalsIgnoreCase(b.getPeriodMonth()))
                .map(UtilityBill::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(activeFlats), 2, RoundingMode.HALF_UP);
    }

    private String buildNotes(UtilityBill b) {
        StringBuilder sb = new StringBuilder();
        if (b.getDescription() != null) sb.append(b.getDescription());
        if (b.getPeriodMonth() != null || b.getPeriodYear() != null) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append("Period: ").append(b.getPeriodMonth() == null ? "" : b.getPeriodMonth())
              .append(" ").append(b.getPeriodYear() == null ? "" : b.getPeriodYear());
        }
        return sb.toString().trim();
    }
}
