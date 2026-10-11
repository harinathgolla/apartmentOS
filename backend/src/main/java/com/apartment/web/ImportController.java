package com.apartment.web;

import com.apartment.imports.ExcelImportService;
import com.apartment.repo.ApartmentRepository;
import com.apartment.security.AuthDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/owner/import")
@RequiredArgsConstructor
public class ImportController {

    private final ExcelImportService importer;
    private final ApartmentRepository apartments;

    private AuthDetails ctx() {
        return (AuthDetails) SecurityContextHolder.getContext().getAuthentication().getDetails();
    }

    private Long requireApartmentId() {
        return apartments.findByOrgId(ctx().orgId()).stream()
                .findFirst()
                .map(a -> a.getId())
                .orElseThrow(() -> new IllegalStateException("Create an apartment first"));
    }

    @PostMapping(value = "/electricity", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> importElectricity(@RequestParam("file") MultipartFile file) throws Exception {
        var result = importer.importElectricity(file, requireApartmentId(), ctx().orgId());
        return Map.of(
                "flatsCreated", result.flatsCreated(),
                "tenanciesCreated", result.tenanciesCreated(),
                "recordsCreated", result.recordsCreated());
    }

    @PostMapping(value = "/houserent", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> importHouseRent(@RequestParam("file") MultipartFile file) throws Exception {
        var result = importer.importHouseRent(file, requireApartmentId(), ctx().orgId());
        return Map.of(
                "flatsCreated", result.flatsCreated(),
                "tenanciesCreated", result.tenanciesCreated(),
                "recordsCreated", result.recordsCreated());
    }
}