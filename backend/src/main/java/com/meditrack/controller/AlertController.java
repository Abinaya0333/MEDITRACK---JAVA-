package com.meditrack.controller;

import com.meditrack.dto.MedicineDto;
import com.meditrack.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final MedicineService medicineService;

    @GetMapping("/low-stock")
    public ResponseEntity<List<MedicineDto.Response>> getLowStockAlerts() {
        return ResponseEntity.ok(medicineService.getLowStockMedicines());
    }

    @GetMapping("/expiry")
    public ResponseEntity<List<MedicineDto.Response>> getExpiryAlerts(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(medicineService.getExpiringSoonMedicines(days));
    }

    @GetMapping("/expired")
    public ResponseEntity<List<MedicineDto.Response>> getExpired() {
        return ResponseEntity.ok(medicineService.getExpiredMedicines());
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllAlerts() {
        return ResponseEntity.ok(Map.of(
                "lowStock", medicineService.getLowStockMedicines(),
                "expiringSoon", medicineService.getExpiringSoonMedicines(30),
                "expired", medicineService.getExpiredMedicines()
        ));
    }
}
