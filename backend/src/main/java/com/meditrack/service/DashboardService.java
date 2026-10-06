package com.meditrack.service;

import com.meditrack.dto.DashboardDto;
import com.meditrack.entity.InventoryTransaction;
import com.meditrack.entity.Medicine;
import com.meditrack.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MedicineRepository medicineRepository;
    private final SaleRepository saleRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Transactional(readOnly = true)
    public DashboardDto.Summary getSummary() {
        DashboardDto.Summary summary = new DashboardDto.Summary();

        LocalDate today = LocalDate.now();
        LocalDate in30 = today.plusDays(30);

        // Stats
        summary.setTotalMedicines(medicineRepository.countByStatus(Medicine.MedicineStatus.ACTIVE));
        Long totalStock = medicineRepository.sumTotalStock();
        summary.setTotalStock(totalStock != null ? totalStock : 0L);
        summary.setLowStockCount(medicineRepository.countLowStockMedicines());
        summary.setExpiredCount(medicineRepository.countExpiredMedicines(today));
        summary.setExpiringSoonCount(medicineRepository.countExpiringSoon(today, in30));
        summary.setTodaySalesCount(saleRepository.countTodaySales());
        BigDecimal todayRev = saleRepository.sumTodayRevenue();
        summary.setTodayRevenue(todayRev != null ? todayRev : BigDecimal.ZERO);

        // Expiry breakdown
        DashboardDto.ExpiryBreakdown breakdown = new DashboardDto.ExpiryBreakdown();
        breakdown.setExpired(medicineRepository.countExpiredMedicines(today));
        breakdown.setWithin7Days(medicineRepository.countExpiringSoon(today, today.plusDays(7)));
        breakdown.setWithin15Days(medicineRepository.countExpiringSoon(today, today.plusDays(15)));
        breakdown.setWithin30Days(medicineRepository.countExpiringSoon(today, today.plusDays(30)));
        summary.setExpiryBreakdown(breakdown);

        // Low stock alerts (top 10)
        List<DashboardDto.AlertItem> lowStockAlerts = medicineRepository.findLowStockMedicines()
                .stream().limit(10).map(m -> {
                    DashboardDto.AlertItem alert = new DashboardDto.AlertItem();
                    alert.setId(m.getId());
                    alert.setMedicineName(m.getName());
                    alert.setBatchNumber(m.getBatchNumber());
                    alert.setQuantity(m.getQuantity());
                    alert.setMinimumStockLevel(m.getMinimumStockLevel());
                    alert.setAlertType("LOW_STOCK");
                    alert.setSeverity(m.getQuantity() == 0 ? "CRITICAL" : "HIGH");
                    alert.setMessage(m.getQuantity() == 0
                            ? m.getName() + " is out of stock"
                            : m.getName() + " is below minimum stock level (" + m.getQuantity() + "/" + m.getMinimumStockLevel() + ")");
                    return alert;
                }).toList();
        summary.setLowStockAlerts(lowStockAlerts);

        // Expiry alerts (top 10, sorted by urgency)
        List<DashboardDto.AlertItem> expiryAlerts = new ArrayList<>();
        medicineRepository.findExpiredMedicines(today).stream().limit(5).forEach(m -> {
            DashboardDto.AlertItem alert = buildExpiryAlert(m);
            expiryAlerts.add(alert);
        });
        medicineRepository.findExpiringSoon(today, in30).stream()
                .filter(m -> m.getExpiryDate().isAfter(today.minusDays(1)))
                .limit(5).forEach(m -> {
                    DashboardDto.AlertItem alert = buildExpiryAlert(m);
                    expiryAlerts.add(alert);
                });
        summary.setExpiryAlerts(expiryAlerts);

        // Recent activity
        List<InventoryTransaction> recentTxs = inventoryTransactionRepository.findTop20ByOrderByCreatedAtDesc();
        List<DashboardDto.RecentActivity> activities = recentTxs.stream().map(tx -> {
            DashboardDto.RecentActivity activity = new DashboardDto.RecentActivity();
            activity.setType(tx.getType().name());
            String medicineName = tx.getMedicine() != null ? tx.getMedicine().getName() : "Unknown";
            activity.setDescription(buildActivityDescription(tx.getType(), medicineName, tx.getQuantity()));
            activity.setTimestamp(tx.getCreatedAt());
            activity.setPerformedBy(tx.getPerformedBy() != null ? tx.getPerformedBy().getFullName() : "System");
            return activity;
        }).toList();
        summary.setRecentActivity(activities);

        return summary;
    }

    private DashboardDto.AlertItem buildExpiryAlert(Medicine m) {
        DashboardDto.AlertItem alert = new DashboardDto.AlertItem();
        alert.setId(m.getId());
        alert.setMedicineName(m.getName());
        alert.setBatchNumber(m.getBatchNumber());
        alert.setQuantity(m.getQuantity());
        alert.setExpiryDate(m.getExpiryDate());

        long days = ChronoUnit.DAYS.between(LocalDate.now(), m.getExpiryDate());
        alert.setDaysUntilExpiry((int) days);
        alert.setAlertType("EXPIRY");

        if (days < 0) {
            alert.setSeverity("CRITICAL");
            alert.setMessage(m.getName() + " expired " + Math.abs(days) + " day(s) ago");
        } else if (days <= 7) {
            alert.setSeverity("HIGH");
            alert.setMessage(m.getName() + " expires in " + days + " day(s)");
        } else if (days <= 15) {
            alert.setSeverity("MEDIUM");
            alert.setMessage(m.getName() + " expires in " + days + " day(s)");
        } else {
            alert.setSeverity("LOW");
            alert.setMessage(m.getName() + " expires in " + days + " day(s)");
        }
        return alert;
    }

    private String buildActivityDescription(InventoryTransaction.TransactionType type, String medicine, int qty) {
        return switch (type) {
            case STOCK_IN -> "Stock added: " + medicine + " +" + qty + " units";
            case STOCK_OUT -> "Stock removed: " + medicine + " -" + qty + " units";
            case ADJUSTMENT -> "Stock adjusted: " + medicine + " → " + qty + " units";
            case SALE -> "Sale recorded: " + medicine + " -" + qty + " units";
            case INVOICE_UPDATE -> "Invoice update: " + medicine + " +" + qty + " units";
        };
    }
}
