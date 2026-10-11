package com.apartment.imports;

import com.apartment.domain.Flat;
import com.apartment.domain.MeterReading;
import com.apartment.domain.RentRecord;
import com.apartment.domain.Tenancy;
import com.apartment.repo.FlatRepository;
import com.apartment.repo.MeterReadingRepository;
import com.apartment.repo.RentRecordRepository;
import com.apartment.repo.TenancyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportService {

    private final FlatRepository flats;
    private final MeterReadingRepository meters;
    private final TenancyRepository tenancies;
    private final RentRecordRepository rents;

    /* ═══════════════════════════════════════════════════════════
       ELECTRICITY WORKBOOK
       - "Meter Details" sheet:  A=Flat No, B=Meter Serial No
       - Per-flat sheets named "101", "102", ... with columns:
         A=Flat No, B=Meter S.No, C=Year, D=Month,
         E=Previous Reading, F=Present Reading, G=Usage,
         H=Rate per unit, I=Bill
       ═══════════════════════════════════════════════════════════ */
    @Transactional
    public ImportResult importElectricity(MultipartFile file, Long apartmentId, Long orgId) throws IOException {
        int flatsCreated = 0;
        int readingsCreated = 0;

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet details = wb.getSheet("Meter Details");
            if (details == null) {
                throw new IllegalArgumentException("Sheet 'Meter Details' not found in workbook");
            }

            Map<String, Double> meterByFlat = new HashMap<>();

            // 1. Walk "Meter Details" and create flats
            for (int i = 1; i <= details.getLastRowNum(); i++) {
                Row r = details.getRow(i);
                if (r == null) continue;
                Double flatNoD = num(r.getCell(0));
                Double meterSn = num(r.getCell(1));
                if (flatNoD == null) continue;

                String flatNo = String.valueOf(flatNoD.intValue());
                meterByFlat.put(flatNo, meterSn);

                if (flats.findByApartmentIdAndFlatNo(apartmentId, flatNo).isEmpty()) {
                    flats.save(Flat.builder()
                            .apartmentId(apartmentId)
                            .flatNo(flatNo)
                            .meterSerialNo(meterSn == null ? null : String.valueOf(meterSn.longValue()))
                            .build());
                    flatsCreated++;
                }
            }

            // 2. Walk per-flat sheets and create meter readings
            for (String flatNo : meterByFlat.keySet()) {
                Sheet s = wb.getSheet(flatNo);
                if (s == null) continue;

                Flat f = flats.findByApartmentIdAndFlatNo(apartmentId, flatNo).orElse(null);
                if (f == null) continue;

                for (int i = 1; i <= s.getLastRowNum(); i++) {
                    Row r = s.getRow(i);
                    if (r == null) continue;

                    Integer year = intVal(r.getCell(2));
                    String month = str(r.getCell(3));
                    if (year == null || month == null || month.isBlank()) continue;

                    BigDecimal prev = bd(r.getCell(4));
                    BigDecimal pres = bd(r.getCell(5));
                    BigDecimal rate = bd(r.getCell(7));
                    BigDecimal usage = pres.subtract(prev);
                    BigDecimal bill = usage.multiply(rate);

                    if (meters.findByFlatIdAndYearAndMonth(f.getId(), year, month).isPresent()) {
                        continue; // skip duplicates
                    }

                    meters.save(MeterReading.builder()
                            .flatId(f.getId())
                            .apartmentId(apartmentId)
                            .year(year)
                            .month(month)
                            .previousReading(prev)
                            .presentReading(pres)
                            .usageUnits(usage)
                            .ratePerUnit(rate)
                            .billAmount(bill)
                            .build());
                    readingsCreated++;
                }
            }
        }

        log.info("Imported electricity — flats: {}, readings: {}", flatsCreated, readingsCreated);
        return new ImportResult(flatsCreated, 0, readingsCreated);
    }

    /* ═══════════════════════════════════════════════════════════
       HOUSE RENT WORKBOOK
       Sheet "HouseRent" with columns:
       A=FlatNo, B=Tenant Name, C=Month, D=Year, E=Rent, F=Ebill,
       G=Total Collected, H=Total Rent, I=House Maid, J=Garbage Vehicle,
       K=Generator Diesel, L=Shared EBill, M=Cumulative Total,
       N=EMI Int, O=Returns, P=Remarks
       ═══════════════════════════════════════════════════════════ */
    @Transactional
    public ImportResult importHouseRent(MultipartFile file, Long apartmentId, Long orgId) throws IOException {
        int tenanciesCreated = 0;
        int recordsCreated = 0;

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet s = wb.getSheet("HouseRent");
            if (s == null) {
                throw new IllegalArgumentException("Sheet 'HouseRent' not found in workbook");
            }

            Map<String, Tenancy> tenancyByFlat = new HashMap<>();

            for (int i = 1; i <= s.getLastRowNum(); i++) {
                Row r = s.getRow(i);
                if (r == null) continue;

                Double flatNoD = num(r.getCell(0));
                String tenantName = str(r.getCell(1));
                String month = str(r.getCell(2));
                Integer year = intVal(r.getCell(3));

                if (flatNoD == null || tenantName == null
                        || month == null || month.isBlank()
                        || year == null) continue;

                String flatNo = String.valueOf(flatNoD.intValue());

                // Ensure flat exists (some rent sheets have flats not listed in meter sheet)
                Flat f = flats.findByApartmentIdAndFlatNo(apartmentId, flatNo)
                        .orElseGet(() -> flats.save(Flat.builder()
                                .apartmentId(apartmentId).flatNo(flatNo).build()));

                // Upsert tenancy by flat + name
                Tenancy t = tenancyByFlat.computeIfAbsent(flatNo, k -> {
                    // Check whether an active tenancy exists in DB
                    var existing = tenancies.findByFlatIdAndActiveTrue(f.getId());
                    if (!existing.isEmpty()) {
                        return existing.get(0);
                    }
                    return tenancies.save(Tenancy.builder()
                            .flatId(f.getId())
                            .apartmentId(apartmentId)
                            .tenantName(tenantName)
                            .active(true)
                            .build());
                });

                // Skip duplicates (same tenancy + year + month)
                if (rents.findByTenancyIdAndYearAndMonth(t.getId(), year, month).isPresent()) {
                    continue;
                }

                BigDecimal rent = bd(r.getCell(4));
                BigDecimal ebill = bd(r.getCell(5));
                BigDecimal houseMaid = bd(r.getCell(8));
                BigDecimal garbage = bd(r.getCell(9));
                BigDecimal genDiesel = bd(r.getCell(10));
                BigDecimal sharedEbill = bd(r.getCell(11));
                BigDecimal emiInt = bd(r.getCell(13));
                BigDecimal returns = bd(r.getCell(14));
                String remarks = str(r.getCell(15));

                BigDecimal total = rent.add(ebill);
                BigDecimal net = total
                        .subtract(houseMaid)
                        .subtract(garbage)
                        .subtract(genDiesel)
                        .subtract(sharedEbill);

                rents.save(RentRecord.builder()
                        .tenancyId(t.getId())
                        .flatId(f.getId())
                        .apartmentId(apartmentId)
                        .tenantName(tenantName)
                        .month(month)
                        .year(year)
                        .rentAmount(rent)
                        .ebillAmount(ebill)
                        .totalCollected(total)
                        .houseMaid(houseMaid)
                        .garbageVehicle(garbage)
                        .generatorDiesel(genDiesel)
                        .sharedEbill(sharedEbill)
                        .emiInterest(emiInt)
                        .returnsAmount(returns)
                        .netIncome(net)
                        .cumulativeTotal(net)
                        .remarks(remarks)
                        .paid(true) // historical rows are assumed settled
                        .build());
                recordsCreated++;
            }
        }

        log.info("Imported HouseRent — tenancies: {}, records: {}", tenanciesCreated, recordsCreated);
        return new ImportResult(0, tenanciesCreated, recordsCreated);
    }

    /* ═══════════════════════════════════════════════════════════
       Excel cell helpers — handle numeric/text/blank uniformly
       ═══════════════════════════════════════════════════════════ */
    private static Double num(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case NUMERIC -> c.getNumericCellValue();
            case STRING -> {
                String s = c.getStringCellValue();
                if (s == null || s.isBlank()) yield null;
                try { yield Double.parseDouble(s.trim()); }
                catch (NumberFormatException e) { yield null; }
            }
            case FORMULA -> {
                try { yield c.getNumericCellValue(); }
                catch (Exception e) { yield null; }
            }
            default -> null;
        };
    }

    private static Integer intVal(Cell c) {
        Double d = num(c);
        return d == null ? null : d.intValue();
    }

    private static String str(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case FORMULA -> c.getCellFormula();
            default -> null;
        };
    }

    private static BigDecimal bd(Cell c) {
        Double d = num(c);
        return d == null ? BigDecimal.ZERO : BigDecimal.valueOf(d);
    }

    /* ═══════════════════════════════════════════════════════════
       Result record returned to controller
       ═══════════════════════════════════════════════════════════ */
    public record ImportResult(int flatsCreated, int tenanciesCreated, int recordsCreated) {}
}