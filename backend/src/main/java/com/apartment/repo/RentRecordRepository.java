package com.apartment.repo;
import com.apartment.domain.RentRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RentRecordRepository extends JpaRepository<RentRecord, Long> {
    List<RentRecord> findByApartmentIdAndYearAndMonth(Long aptId, Integer year, String month);
    Page<RentRecord> findByTenancyIdOrderByYearDescMonthDescIdDesc(Long tenancyId, Pageable pageable);
    List<RentRecord> findByApartmentIdAndYear(Long aptId, Integer year);
    List<RentRecord> findByApartmentIdOrderByYearDescIdDesc(Long aptId);
    List<RentRecord> findByTenancyIdOrderByYearDescIdDesc(Long tenancyId);
    Optional<RentRecord> findByTenancyIdAndYearAndMonth(Long tenancyId, Integer year, String month);
}
