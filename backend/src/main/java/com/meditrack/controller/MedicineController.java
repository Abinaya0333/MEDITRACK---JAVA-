package com.meditrack.controller;

import com.meditrack.dto.MedicineDto;
import com.meditrack.repository.InventoryTransactionRepository;
import com.meditrack.service.MedicineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @GetMapping
    public ResponseEntity<Page<MedicineDto.Response>> getMedicines(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        return ResponseEntity.ok(medicineService.getMedicines(search, category, page, size, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicineDto.Response> getMedicine(@PathVariable Long id) {
        return ResponseEntity.ok(medicineService.getMedicineById(id));
    }

    @PostMapping
    public ResponseEntity<MedicineDto.Response> createMedicine(@Valid @RequestBody MedicineDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(medicineService.createMedicine(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicineDto.Response> updateMedicine(@PathVariable Long id,
                                                               @Valid @RequestBody MedicineDto.Request request) {
        return ResponseEntity.ok(medicineService.updateMedicine(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMedicine(@PathVariable Long id) {
        medicineService.deleteMedicine(id);
        return ResponseEntity.ok(Map.of("message", "Medicine deactivated successfully"));
    }

    @PostMapping("/{id}/stock")
    public ResponseEntity<MedicineDto.Response> updateStock(@PathVariable Long id,
                                                             @Valid @RequestBody MedicineDto.StockUpdateRequest request) {
        return ResponseEntity.ok(medicineService.updateStock(id, request));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(medicineService.getCategories());
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<MedicineDto.Response>> getLowStock() {
        return ResponseEntity.ok(medicineService.getLowStockMedicines());
    }

    @GetMapping("/expired")
    public ResponseEntity<List<MedicineDto.Response>> getExpired() {
        return ResponseEntity.ok(medicineService.getExpiredMedicines());
    }

    @GetMapping("/expiring-soon")
    public ResponseEntity<List<MedicineDto.Response>> getExpiringSoon(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(medicineService.getExpiringSoonMedicines(days));
    }
}
