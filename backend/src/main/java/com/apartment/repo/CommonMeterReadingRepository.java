package com.apartment.repo;
import com.apartment.domain.CommonMeterReading;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CommonMeterReadingRepository extends JpaRepository<CommonMeterReading, Long> {
    List<CommonMeterReading> findByApartmentIdOrderByYearDescIdDesc(Long apartmentId);
    List<CommonMeterReading> findByApartmentIdAndYearAndMonth(Long apartmentId, Integer year, String month);
}
