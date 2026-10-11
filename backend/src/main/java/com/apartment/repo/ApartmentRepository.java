package com.apartment.repo;
import com.apartment.domain.Apartment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    List<Apartment> findByOrgId(Long orgId);
}
