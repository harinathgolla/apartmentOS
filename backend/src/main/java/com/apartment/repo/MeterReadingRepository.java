package com.apartment.repo;
import com.apartment.domain.MeterReading;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {
    List<MeterReading> findByApartmentIdAndYearAndMonth(Long aptId, Integer year, String month);
    List<MeterReading> findByFlatIdOrderByYearDescIdDesc(Long flatId);
    Optional<MeterReading> findByFlatIdAndYearAndMonth(Long flatId, Integer year, String month);
}
