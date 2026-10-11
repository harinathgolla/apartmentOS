package com.apartment.repo;
import com.apartment.domain.Org;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OrgRepository extends JpaRepository<Org, Long> {
    Optional<Org> findBySlug(String slug);
}
