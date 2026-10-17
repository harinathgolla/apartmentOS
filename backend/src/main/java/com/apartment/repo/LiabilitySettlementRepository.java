package com.apartment.repo;
import com.apartment.domain.LiabilitySettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LiabilitySettlementRepository extends JpaRepository<LiabilitySettlement, Long> {
    List<LiabilitySettlement> findByTenancyIdOrderBySettledDateDescIdDesc(Long tenancyId);
    List<LiabilitySettlement> findByApartmentIdOrderBySettledDateDescIdDesc(Long apartmentId);
}
