package com.meditrack.controller;

import com.meditrack.dto.MedicineDto;
import com.meditrack.dto.SaleDto;
import com.meditrack.entity.SaleItem;
import com.meditrack.repository.MedicineRepository;
import com.meditrack.repository.SaleItemRepository;
import com.meditrack.service.MedicineService;
import com.meditrack.service.SaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final MedicineService medicineService;
    private final SaleService saleService;
    private final MedicineRepository medicineRepository;
    private final SaleItemRepository saleItemRepository;

    @GetMapping("/inventory")
    public ResponseEntity<Page<MedicineDto.Response>> inventoryReport(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(medicineService.getMedicines(null, null, page, size, "name", "asc"));
    }

    @GetMapping("/expiry")
    public ResponseEntity<List<MedicineDto.Response>> expiryReport(
            @RequestParam(defaultValue = "90") int days) {
        List<MedicineDto.Response> expiring = medicineService.getExpiringSoonMedicines(days);
        List<MedicineDto.Response> expired = medicineService.getExpiredMedicines();
        List<MedicineDto.Response> combined = new ArrayList<>();
        combined.addAll(expired);
        combined.addAll(expiring);
        return ResponseEntity.ok(combined);
    }

    @GetMapping("/sales")
    public ResponseEntity<Page<SaleDto.Response>> salesReport(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(saleService.getSales(page, size));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<MedicineDto.Response>> lowStockReport() {
        return ResponseEntity.ok(medicineService.getLowStockMedicines());
    }
}
