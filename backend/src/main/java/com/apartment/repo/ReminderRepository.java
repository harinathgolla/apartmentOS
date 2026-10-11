package com.apartment.repo;
import com.apartment.domain.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByApartmentIdOrderBySentAtDesc(Long apartmentId);
}
