package com.apartment.service;

import com.apartment.domain.Reminder;
import com.apartment.domain.User;
import com.apartment.repo.ReminderRepository;
import com.apartment.repo.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "gmail-api")
public class GmailApiMailerService implements MailerService {

    private final UserRepository users;
    private final ReminderRepository reminders;

    @Value("${spring.security.oauth2.client.registration.google.client-id:not-configured}")
    String clientId;
    @Value("${spring.security.oauth2.client.registration.google.client-secret:not-configured}")
    String clientSecret;
    @Value("${app.gmail.from-name:Apartment Manager}")
    String fromName;

    @Override
    public void send(Long senderUserId, Long apartmentId, Long tenancyId,
                     String to, String subject, String htmlBody) {
        Reminder rem = Reminder.builder()
                .apartmentId(apartmentId).tenancyId(tenancyId)
                .recipientEmail(to).subject(subject).body(htmlBody)
                .status("PENDING").build();
        try {
            if ("not-configured".equals(clientId))
                throw new IllegalStateException("Google OAuth not configured");

            User owner = users.findById(senderUserId).orElseThrow();
            if (owner.getGoogleRefreshToken() == null)
                throw new IllegalStateException("Owner has not connected Gmail");

            GoogleCredential cred = new GoogleCredential.Builder()
                    .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                    .setJsonFactory(GsonFactory.getDefaultInstance())
                    .setClientSecrets(clientId, clientSecret)
                    .build()
                    .setRefreshToken(owner.getGoogleRefreshToken());

            Gmail gmail = new Gmail.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(), cred)
                    .setApplicationName("ApartmentSaaS").build();

            MimeMessage mime = new MimeMessage(Session.getInstance(new Properties()));
            mime.setFrom(new InternetAddress(owner.getEmail(), fromName));
            mime.setRecipients(MimeMessage.RecipientType.TO, InternetAddress.parse(to));
            mime.setSubject(subject, "UTF-8");
            mime.setContent(htmlBody, "text/html; charset=UTF-8");

            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            mime.writeTo(buf);
            Message msg = new Message();
            msg.setRaw(Base64.getUrlEncoder().encodeToString(buf.toByteArray()));
            gmail.users().messages().send("me", msg).execute();

            rem.setStatus("SENT");
            log.info("Reminder sent via Gmail API to {}", to);
        } catch (Exception e) {
            rem.setStatus("FAILED");
            rem.setError(e.getMessage());
            log.error("Gmail API send failed to {}", to, e);
        } finally {
            reminders.save(rem);
        }
    }
}