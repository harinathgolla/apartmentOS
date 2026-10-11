package com.apartment.scheduler;
import com.apartment.domain.Tenancy;
import com.apartment.repo.TenancyRepository;
import com.apartment.repo.UserRepository;
import com.apartment.service.ReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j @Component @RequiredArgsConstructor
public class RentReminderScheduler {
    private final TenancyRepository tenancies;
    private final UserRepository users;
    private final ReminderService reminders;

    /** Runs the 1st of every month at 09:00 IST (03:30 UTC). */
    @Scheduled(cron = "0 30 3 1 * *", zone = "Asia/Kolkata")
    public void monthlyReminders() {
        String month = LocalDate.now().getMonth().name();
        int year = LocalDate.now().getYear();
        log.info("Dispatching monthly rent reminders for {} {}", month, year);
        List<Tenancy> active = tenancies.findAll().stream().filter(Tenancy::getActive).toList();
        for (Tenancy t : active) {
            try {
                var apt = t.getApartmentId();
                Long ownerId = users.findAll().stream()
                        .filter(u -> apt.equals(u.getOrgId()) && u.getRole().name().equals("OWNER"))
                        .map(u -> u.getId()).findFirst().orElse(null);
                if (ownerId == null) continue;
                reminders.sendRentReminder(ownerId, apt, t.getId(), month, year, null);
            } catch (Exception e) {
                log.error("Reminder failed for tenancy {}", t.getId(), e);
            }
        }
    }
}
