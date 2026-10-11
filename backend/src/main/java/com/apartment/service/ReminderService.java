package com.apartment.service;
import com.apartment.domain.*;
import com.apartment.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;

@Service @RequiredArgsConstructor
public class ReminderService {
    private final MailerService mailer;
    private final RentRecordRepository rentRepo;
    private final TenancyRepository tenancyRepo;

    public void sendRentReminder(Long ownerId, Long aptId, Long tenancyId,
                                 String month, Integer year, String customMessage) {
        Tenancy t = tenancyRepo.findById(tenancyId).orElseThrow();
        if (t.getTenantEmail() == null) throw new IllegalArgumentException("Tenant email missing");

        RentRecord r = rentRepo.findByTenancyIdAndYearAndMonth(tenancyId, year, month).orElse(null);
        String subject = "Rent Reminder — " + month + " " + year;
        String body = buildBody(t, r, customMessage);
        mailer.send(ownerId, aptId, tenancyId, t.getTenantEmail(), subject, body);
    }

    private String buildBody(Tenancy t, RentRecord r, String custom) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div style='font-family:Arial,sans-serif;font-size:14px'>");
        sb.append("<h2>Rent Payment Reminder</h2>");
        sb.append("<p>Dear ").append(t.getTenantName()).append(",</p>");
        if (custom != null && !custom.isBlank())
            sb.append("<p>").append(custom).append("</p>");
        sb.append("<table cellpadding='6' border='1' style='border-collapse:collapse'>");
        if (r != null) {
            sb.append("<tr><td>Month</td><td>").append(r.getMonth()).append(" ").append(r.getYear()).append("</td></tr>");
            sb.append("<tr><td>Rent</td><td>₹").append(bd(r.getRentAmount())).append("</td></tr>");
            sb.append("<tr><td>Electricity</td><td>₹").append(bd(r.getEbillAmount())).append("</td></tr>");
            sb.append("<tr><td><b>Total</b></td><td><b>₹").append(bd(r.getTotalCollected())).append("</b></td></tr>");
            sb.append("<tr><td>Status</td><td>").append(Boolean.TRUE.equals(r.getPaid()) ? "Paid" : "Pending").append("</td></tr>");
        } else {
            sb.append("<tr><td>Month</td><td>").append(custom).append("</td></tr>");
        }
        sb.append("</table><p>Kindly ignore if already paid.</p></div>");
        return sb.toString();
    }

    private String bd(BigDecimal v) { return v == null ? "0" : v.toPlainString(); }
}
