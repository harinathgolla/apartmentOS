package com.apartment.repo;
import com.apartment.domain.Tenancy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TenancyRepository extends JpaRepository<Tenancy, Long> {
    List<Tenancy> findByApartmentIdAndActiveTrue(Long apartmentId);

    Page<Tenancy> findByApartmentIdAndActiveTrueOrderByIdDesc(Long apartmentId, Pageable pageable);

    Page<Tenancy> findByApartmentIdAndActiveFalseOrderByIdDesc(Long apartmentId, Pageable pageable);

    Page<Tenancy> findByApartmentIdOrderByActiveDescIdDesc(Long apartmentId, Pageable pageable);
    Optional<Tenancy> findByTenantUserIdAndActiveTrue(Long tenantUserId);
    List<Tenancy> findByFlatIdAndActiveTrue(Long flatId);
}
