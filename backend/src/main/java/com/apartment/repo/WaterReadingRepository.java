package com.apartment.repo;
import com.apartment.domain.WaterReading;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface WaterReadingRepository extends JpaRepository<WaterReading, Long> {
    List<WaterReading> findByApartmentIdAndYearAndMonth(Long aptId, Integer year, String month);
    Optional<WaterReading> findByFlatIdAndYearAndMonth(Long flatId, Integer year, String month);
    List<WaterReading> findByFlatIdOrderByYearDescIdDesc(Long flatId);
}
