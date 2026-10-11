package com.apartment.service;
import com.apartment.domain.Expense;
import com.apartment.dto.AuthDtos.ExpenseRequest;
import com.apartment.repo.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service @RequiredArgsConstructor
public class ExpenseService {
    private final ExpenseRepository repo;

    public Expense create(Long userId, ExpenseRequest r) {
        return repo.save(Expense.builder()
                .apartmentId(r.apartmentId()).category(r.category()).subcategory(r.subcategory())
                .amount(r.amount()).expenseDate(r.expenseDate())
                .vendor(r.vendor()).invoiceNo(r.invoiceNo()).notes(r.notes())
                .createdBy(userId).build());
    }
    public List<Expense> forApartment(Long aptId) { return repo.findByApartmentIdOrderByExpenseDateDesc(aptId); }
}
