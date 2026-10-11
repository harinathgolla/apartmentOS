package com.apartment.service;

public interface MailerService {
    /**
     * Sends an email on behalf of the given user (owner).
     * For real deployments this uses the user's Gmail API refresh token.
     * For dev (mock-oauth profile) it sends via SMTP -> MailHog.
     */
    void send(Long senderUserId, Long apartmentId, Long tenancyId,
              String to, String subject, String htmlBody);
}