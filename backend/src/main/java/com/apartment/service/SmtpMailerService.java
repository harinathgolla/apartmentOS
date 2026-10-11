package com.apartment.service;

import com.apartment.domain.Reminder;
import com.apartment.domain.User;
import com.apartment.repo.ReminderRepository;
import com.apartment.repo.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "smtp", matchIfMissing = true)
public class SmtpMailerService implements MailerService {

    private final UserRepository users;
    private final ReminderRepository reminders;
    private final JavaMailSender mailSender;   // auto-configured by spring-boot-starter-mail

    @Value("${app.gmail.from-name:Apartment Manager}")
    String fromName;

    @Override
    public void send(Long senderUserId, Long apartmentId, Long tenancyId,
                     String to, String subject, String htmlBody) {
        Reminder rem = Reminder.builder()
                .apartmentId(apartmentId)
                .tenancyId(tenancyId)
                .recipientEmail(to)
                .subject(subject)
                .body(htmlBody)
                .status("PENDING")
                .build();
        try {
            User sender = users.findById(senderUserId).orElseThrow();
            MimeMessage mime = new MimeMessage(Session.getInstance(new Properties()));
            mime.setFrom(new InternetAddress(
                    "dev@apartment.local",
                    fromName + " (on behalf of " + sender.getEmail() + ")"));
            mime.setRecipients(MimeMessage.RecipientType.TO, InternetAddress.parse(to));
            mime.setSubject(subject, "UTF-8");
            mime.setContent(htmlBody, "text/html; charset=UTF-8");
            mailSender.send(mime);

            rem.setStatus("SENT");
            log.info("Reminder sent via SMTP to {} (open http://localhost:8025 to view)", to);
        } catch (Exception e) {
            rem.setStatus("FAILED");
            rem.setError(e.getMessage());
            log.error("SMTP send failed for {}", to, e);
        } finally {
            reminders.save(rem);
        }
    }
}