package com.apartment.repo;
import com.apartment.domain.Tenancy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TenancyRepository extends JpaRepository<Tenancy, Long> {
    List<Tenancy> findByApartmentIdAndActiveTrue(Long apartmentId);
    Optional<Tenancy> findByTenantUserIdAndActiveTrue(Long tenantUserId);
    List<Tenancy> findByFlatIdAndActiveTrue(Long flatId);
}
