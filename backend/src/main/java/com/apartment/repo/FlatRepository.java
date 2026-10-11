package com.apartment.repo;
import com.apartment.domain.Flat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface FlatRepository extends JpaRepository<Flat, Long> {
    List<Flat> findByApartmentId(Long apartmentId);
    Optional<Flat> findByApartmentIdAndFlatNo(Long apartmentId, String flatNo);
}
