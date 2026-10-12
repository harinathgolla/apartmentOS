package com.apartment.repo;
import com.apartment.domain.UtilityBill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UtilityBillRepository extends JpaRepository<UtilityBill, Long> {
    List<UtilityBill> findByApartmentIdOrderByBillDateDesc(Long apartmentId);
    List<UtilityBill> findByApartmentIdAndCategory(Long apartmentId, String category);
    List<UtilityBill> findByApartmentIdAndPeriodYear(Long apartmentId, Integer periodYear);
}
