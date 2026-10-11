package com.apartment.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class AuthDtos {
    public record RegisterRequest(
        @Email String email, @NotBlank String password, @NotBlank String fullName,
        String phone, @NotBlank String role, String orgName) {}
    public record LoginRequest(@Email String email, @NotBlank String password) {}
    public record AuthResponse(String token, Long userId, Long orgId, Long apartmentId,
                               String role, String email, String fullName) {}

    public record ApartmentRequest(@NotBlank String name, String address, String city,
                                   String state, String pincode, Integer totalFloors,
                                   BigDecimal purchaseValue, LocalDate purchaseDate,
                                   BigDecimal loanAmount, BigDecimal loanEmi,
                                   BigDecimal loanInterestRate) {}
    public record FlatRequest(@NotBlank String flatNo, Integer floor, String meterSerialNo,
                              String ownerName, String ownerPhone, BigDecimal areaSqft, Integer bedrooms) {}

    public record TenantRequest(@NotBlank String tenantName, String tenantPhone, String tenantEmail,
                                @NotNull Long flatId, BigDecimal rentAmount, BigDecimal securityDeposit,
                                LocalDate startDate, LocalDate endDate,
                                String frequency, Integer dueDay) {}

    public record TenantUpdateRequest(String tenantName, String tenantPhone, String tenantEmail,
                                      BigDecimal rentAmount, BigDecimal securityDeposit,
                                      LocalDate startDate, LocalDate endDate, Boolean active,
                                      String frequency, Integer dueDay) {}

    public record CollectRentRequest(@NotNull Long tenancyId, @NotBlank String month, @NotNull Integer year,
                                     BigDecimal rentAmount, BigDecimal ebillAmount,
                                     BigDecimal waterBill, BigDecimal maintenanceCharge,
                                     BigDecimal houseMaid, BigDecimal garbageVehicle,
                                     BigDecimal generatorDiesel, BigDecimal sharedEbill,
                                     BigDecimal emiInterest, String paymentMode,
                                     LocalDate paidDate, String remarks) {}

    public record BulkCollectRequest(@NotBlank String month, @NotNull Integer year,
                                     String paymentMode, List<Long> tenancyIds) {}

    public record RentRecordRequest(Long tenancyId, Long flatId, String month, Integer year,
                                    BigDecimal rentAmount, BigDecimal ebillAmount,
                                    BigDecimal houseMaid, BigDecimal garbageVehicle,
                                    BigDecimal generatorDiesel, BigDecimal sharedEbill,
                                    BigDecimal emiInterest, BigDecimal returnsAmount,
                                    String remarks, Boolean paid) {}
    public record MeterReadingRequest(@NotNull Long flatId, @NotNull Integer year, @NotBlank String month,
                                      BigDecimal previousReading, BigDecimal presentReading,
                                      BigDecimal ratePerUnit) {}
    public record ReminderRequest(String month, Integer year, String customMessage, Boolean sendToAll) {}
    public record ExpenseRequest(Long apartmentId, @NotBlank String category, String subcategory,
                                 @NotNull BigDecimal amount, @NotNull LocalDate expenseDate,
                                 String vendor, String invoiceNo, String notes) {}
}