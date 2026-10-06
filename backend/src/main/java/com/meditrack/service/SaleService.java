package com.meditrack.service;

import com.meditrack.dto.SaleDto;
import com.meditrack.entity.*;
import com.meditrack.exception.BadRequestException;
import com.meditrack.exception.ResourceNotFoundException;
import com.meditrack.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final UserRepository userRepository;

    private static final AtomicInteger saleCounter = new AtomicInteger(1000);

    @Transactional
    public SaleDto.Response recordSale(SaleDto.Request request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Sale must have at least one item");
        }

        User currentUser = getCurrentUser();
        Sale sale = Sale.builder()
                .saleNumber("SALE-" + DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDateTime.now())
                        + "-" + saleCounter.incrementAndGet())
                .notes(request.getNotes())
                .performedBy(currentUser)
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (SaleDto.SaleItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                    .filter(m -> m.getStatus() == Medicine.MedicineStatus.ACTIVE)
                    .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + itemReq.getMedicineId()));

            if (medicine.getQuantity() < itemReq.getQuantity()) {
                throw new BadRequestException(
                        "Insufficient stock for " + medicine.getName() +
                        ". Available: " + medicine.getQuantity() + ", Requested: " + itemReq.getQuantity());
            }

            BigDecimal lineTotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(lineTotal);

            SaleItem saleItem = SaleItem.builder()
                    .sale(sale)
                    .medicine(medicine)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .totalPrice(lineTotal)
                    .build();
            sale.getItems().add(saleItem);

            // Reduce stock
            int prev = medicine.getQuantity();
            medicine.setQuantity(prev - itemReq.getQuantity());
            medicineRepository.save(medicine);

            // Record transaction
            InventoryTransaction tx = InventoryTransaction.builder()
                    .medicine(medicine)
                    .type(InventoryTransaction.TransactionType.SALE)
                    .quantity(itemReq.getQuantity())
                    .previousQuantity(prev)
                    .newQuantity(medicine.getQuantity())
                    .notes("Sale: " + sale.getSaleNumber())
                    .referenceNumber(sale.getSaleNumber())
                    .performedBy(currentUser)
                    .build();
            inventoryTransactionRepository.save(tx);
        }

        sale.setTotalAmount(total);
        sale = saleRepository.save(sale);
        return toResponse(sale);
    }

    public Page<SaleDto.Response> getSales(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return saleRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    private SaleDto.Response toResponse(Sale sale) {
        SaleDto.Response r = new SaleDto.Response();
        r.setId(sale.getId());
        r.setSaleNumber(sale.getSaleNumber());
        r.setTotalAmount(sale.getTotalAmount());
        r.setNotes(sale.getNotes());
        r.setPerformedByName(sale.getPerformedBy() != null ? sale.getPerformedBy().getFullName() : null);
        r.setCreatedAt(sale.getCreatedAt());

        if (sale.getItems() != null) {
            r.setItems(sale.getItems().stream().map(item -> {
                SaleDto.SaleItemResponse ir = new SaleDto.SaleItemResponse();
                ir.setId(item.getId());
                ir.setMedicineId(item.getMedicine() != null ? item.getMedicine().getId() : null);
                ir.setMedicineName(item.getMedicine() != null ? item.getMedicine().getName() : null);
                ir.setQuantity(item.getQuantity());
                ir.setUnitPrice(item.getUnitPrice());
                ir.setTotalPrice(item.getTotalPrice());
                return ir;
            }).toList());
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
