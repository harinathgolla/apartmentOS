package com.apartment.repo;

import com.apartment.domain.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByApartmentIdOrderByExpenseDateDesc(Long apartmentId);

    @Query("""
           SELECT e FROM Expense e
           WHERE e.apartmentId = :apartmentId
             AND EXTRACT(YEAR FROM e.expenseDate) = :year
           ORDER BY e.expenseDate DESC
           """)
    List<Expense> findByApartmentIdAndYear(@Param("apartmentId") Long apartmentId,
                                           @Param("year") Integer year);
}