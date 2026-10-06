package com.meditrack.controller;

import com.meditrack.entity.InventoryTransaction;
import com.meditrack.repository.InventoryTransactionRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryTransactionRepository transactionRepository;

    @GetMapping("/transactions")
    public ResponseEntity<Page<TransactionResponse>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) Long medicineId) {
        Pageable pageable = PageRequest.of(page, size);
        Page<InventoryTransaction> txPage;
        if (medicineId != null) {
            txPage = transactionRepository.findByMedicineIdOrderByCreatedAtDesc(medicineId, pageable);
        } else {
            txPage = transactionRepository.findAllOrderByCreatedAtDesc(pageable);
        }
        return ResponseEntity.ok(txPage.map(this::toResponse));
    }

    @GetMapping("/activity")
    public ResponseEntity<List<TransactionResponse>> getRecentActivity(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "50") int size) {
        int boundedDays = Math.min(Math.max(days, 1), 365);
        int boundedSize = Math.min(Math.max(size, 1), 200);
        LocalDateTime since = LocalDateTime.now().minusDays(boundedDays);
        return ResponseEntity.ok(transactionRepository
                .findRecentActivity(since).stream()
                .limit(boundedSize)
                .map(this::toResponse).toList());
    }

    private TransactionResponse toResponse(InventoryTransaction tx) {
        TransactionResponse r = new TransactionResponse();
        r.setId(tx.getId());
        r.setMedicineId(tx.getMedicine() != null ? tx.getMedicine().getId() : null);
        r.setMedicineName(tx.getMedicine() != null ? tx.getMedicine().getName() : null);
        r.setType(tx.getType().name());
        r.setQuantity(tx.getQuantity());
        r.setPreviousQuantity(tx.getPreviousQuantity());
        r.setNewQuantity(tx.getNewQuantity());
        r.setNotes(tx.getNotes());
        r.setReferenceNumber(tx.getReferenceNumber());
        r.setPerformedByName(tx.getPerformedBy() != null ? tx.getPerformedBy().getFullName() : null);
        r.setCreatedAt(tx.getCreatedAt());
        return r;
    }

    @Data
    static class TransactionResponse {
        private Long id;
        private Long medicineId;
        private String medicineName;
        private String type;
        private Integer quantity;
        private Integer previousQuantity;
        private Integer newQuantity;
        private String notes;
        private String referenceNumber;
        private String performedByName;
        private LocalDateTime createdAt;
    }
}
