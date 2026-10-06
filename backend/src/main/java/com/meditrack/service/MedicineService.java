package com.meditrack.service;

import com.meditrack.dto.MedicineDto;
import com.meditrack.entity.InventoryTransaction;
import com.meditrack.entity.Medicine;
import com.meditrack.entity.User;
import com.meditrack.exception.BadRequestException;
import com.meditrack.exception.ResourceNotFoundException;
import com.meditrack.repository.InventoryTransactionRepository;
import com.meditrack.repository.MedicineRepository;
import com.meditrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final UserRepository userRepository;

    public Page<MedicineDto.Response> getMedicines(String search, String category,
                                                     int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Medicine> medicines = medicineRepository.searchMedicines(
                search == null || search.isBlank() ? null : search.trim(),
                category == null || category.isBlank() ? null : category.trim(),
                pageable);
        return medicines.map(this::toResponse);
    }

    public MedicineDto.Response getMedicineById(Long id) {
        return toResponse(findMedicineById(id));
    }

    @Transactional
    public MedicineDto.Response createMedicine(MedicineDto.Request request) {
        Medicine medicine = Medicine.builder()
                .name(request.getName())
                .genericName(request.getGenericName())
                .category(request.getCategory())
                .manufacturer(request.getManufacturer())
                .batchNumber(request.getBatchNumber())
                .supplier(request.getSupplier())
                .quantity(request.getQuantity())
                .minimumStockLevel(request.getMinimumStockLevel())
                .purchasePrice(request.getPurchasePrice())
                .sellingPrice(request.getSellingPrice())
                .expiryDate(request.getExpiryDate())
                .manufacturingDate(request.getManufacturingDate())
                .build();

        medicine = medicineRepository.save(medicine);

        if (request.getQuantity() > 0) {
            recordTransaction(medicine, InventoryTransaction.TransactionType.STOCK_IN,
                    request.getQuantity(), 0, request.getQuantity(), "Initial stock on creation", null);
        }

        return toResponse(medicine);
    }

    @Transactional
    public MedicineDto.Response updateMedicine(Long id, MedicineDto.Request request) {
        Medicine medicine = findMedicineById(id);

        medicine.setName(request.getName());
        medicine.setGenericName(request.getGenericName());
        medicine.setCategory(request.getCategory());
        medicine.setManufacturer(request.getManufacturer());
        medicine.setBatchNumber(request.getBatchNumber());
        medicine.setSupplier(request.getSupplier());
        medicine.setMinimumStockLevel(request.getMinimumStockLevel());
        medicine.setPurchasePrice(request.getPurchasePrice());
        medicine.setSellingPrice(request.getSellingPrice());
        medicine.setExpiryDate(request.getExpiryDate());
        medicine.setManufacturingDate(request.getManufacturingDate());

        if (!medicine.getQuantity().equals(request.getQuantity())) {
            int prev = medicine.getQuantity();
            int diff = request.getQuantity() - prev;
            medicine.setQuantity(request.getQuantity());
            recordTransaction(medicine, InventoryTransaction.TransactionType.ADJUSTMENT,
                    Math.abs(diff), prev, request.getQuantity(), "Manual quantity adjustment during edit", null);
        }

        return toResponse(medicineRepository.save(medicine));
    }

    @Transactional
    public void deleteMedicine(Long id) {
        Medicine medicine = findMedicineById(id);
        medicine.setStatus(Medicine.MedicineStatus.INACTIVE);
        medicineRepository.save(medicine);
    }

    @Transactional
    public MedicineDto.Response updateStock(Long id, MedicineDto.StockUpdateRequest request) {
        Medicine medicine = findMedicineById(id);
        int prev = medicine.getQuantity();

        InventoryTransaction.TransactionType type;
        try {
            type = InventoryTransaction.TransactionType.valueOf(request.getType().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid transaction type: " + request.getType()
                    + ". Valid types: STOCK_IN, STOCK_OUT, ADJUSTMENT");
        }

        if (type != InventoryTransaction.TransactionType.ADJUSTMENT && request.getQuantity() < 1) {
            throw new BadRequestException("Quantity must be at least 1 for " + type);
        }

        int newQty;
        switch (type) {
            case STOCK_IN -> newQty = prev + request.getQuantity();
            case STOCK_OUT -> {
                if (prev < request.getQuantity()) {
                    throw new BadRequestException(
                            "Insufficient stock. Available: " + prev + ", Requested: " + request.getQuantity());
                }
                newQty = prev - request.getQuantity();
            }
            case ADJUSTMENT -> newQty = request.getQuantity();
            default -> throw new BadRequestException(
                    "Unsupported stock transaction type: " + type
                            + ". Use STOCK_IN, STOCK_OUT or ADJUSTMENT.");
        }

        if (newQty < 0) throw new BadRequestException("Stock cannot be negative");

        medicine.setQuantity(newQty);
        medicine = medicineRepository.save(medicine);

        int recordedQty = type == InventoryTransaction.TransactionType.ADJUSTMENT
                ? Math.abs(newQty - prev)
                : request.getQuantity();
        recordTransaction(medicine, type, recordedQty, prev, newQty, request.getNotes(), null);

        return toResponse(medicine);
    }

    public List<String> getCategories() {
        return medicineRepository.findDistinctCategories();
    }

    public List<MedicineDto.Response> getLowStockMedicines() {
        return medicineRepository.findLowStockMedicines().stream().map(this::toResponse).toList();
    }

    public List<MedicineDto.Response> getExpiredMedicines() {
        LocalDate today = LocalDate.now();
        return medicineRepository.findExpiredMedicines(today).stream().map(this::toResponse).toList();
    }

    public List<MedicineDto.Response> getExpiringSoonMedicines(int days) {
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);
        return medicineRepository.findExpiringWithinDays(today, endDate).stream().map(this::toResponse).toList();
    }

    // ---- Helpers ----

    private Medicine findMedicineById(Long id) {
        return medicineRepository.findById(id)
                .filter(m -> m.getStatus() == Medicine.MedicineStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found with id: " + id));
    }

    public void recordTransaction(Medicine medicine, InventoryTransaction.TransactionType type,
                                   int qty, int prev, int newQty, String notes, String ref) {
        User currentUser = getCurrentUser();
        InventoryTransaction tx = InventoryTransaction.builder()
                .medicine(medicine)
                .type(type)
                .quantity(qty)
                .previousQuantity(prev)
                .newQuantity(newQty)
                .notes(notes)
                .referenceNumber(ref)
                .performedBy(currentUser)
                .build();
        inventoryTransactionRepository.save(tx);
    }

    public MedicineDto.Response toResponse(Medicine m) {
        MedicineDto.Response r = new MedicineDto.Response();
        r.setId(m.getId());
        r.setName(m.getName());
        r.setGenericName(m.getGenericName());
        r.setCategory(m.getCategory());
        r.setManufacturer(m.getManufacturer());
        r.setBatchNumber(m.getBatchNumber());
        r.setSupplier(m.getSupplier());
        r.setQuantity(m.getQuantity());
        r.setMinimumStockLevel(m.getMinimumStockLevel());
        r.setPurchasePrice(m.getPurchasePrice());
        r.setSellingPrice(m.getSellingPrice());
        r.setExpiryDate(m.getExpiryDate());
        r.setManufacturingDate(m.getManufacturingDate());
        r.setCreatedAt(m.getCreatedAt());
        r.setUpdatedAt(m.getUpdatedAt());
        r.setStatus(m.getStatus().name());

        // Calculate stock status
        if (m.getQuantity() <= 0) {
            r.setStockStatus("OUT_OF_STOCK");
        } else if (m.getQuantity() <= m.getMinimumStockLevel()) {
            r.setStockStatus("LOW_STOCK");
        } else {
            r.setStockStatus("IN_STOCK");
        }

        // Calculate expiry status
        if (m.getExpiryDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), m.getExpiryDate());
            r.setDaysUntilExpiry((int) days);
            if (days < 0) {
                r.setExpiryStatus("EXPIRED");
            } else if (days <= 7) {
                r.setExpiryStatus("EXPIRING_7");
            } else if (days <= 15) {
                r.setExpiryStatus("EXPIRING_15");
            } else if (days <= 30) {
                r.setExpiryStatus("EXPIRING_30");
            } else {
                r.setExpiryStatus("GOOD");
            }
        } else {
            r.setExpiryStatus("UNKNOWN");
        }

        return r;
    }

    private User getCurrentUser() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}
