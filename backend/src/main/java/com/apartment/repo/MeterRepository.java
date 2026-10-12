package com.apartment.repo;
import com.apartment.domain.Meter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface MeterRepository extends JpaRepository<Meter, Long> {
    List<Meter> findByApartmentId(Long apartmentId);
    List<Meter> findByApartmentIdAndFlatId(Long apartmentId, Long flatId);
    Optional<Meter> findByFlatIdAndUtilityType(Long flatId, Meter.UtilityType utilityType);
}
