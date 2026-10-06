package com.meditrack.service;

import com.meditrack.entity.Medicine;
import com.meditrack.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Daily expiry/stock sweep. Gives the "Expiry Alert System" its background half:
 * alerts are recomputed on a schedule so a long-running deployment surfaces
 * deteriorating stock even when no user opens the dashboard.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpiryAlertScheduler {

    private final MedicineRepository medicineRepository;

    @Value("${app.alerts.horizon-days:30}")
    private int horizonDays;

    @Value("${app.alerts.scan-enabled:true}")
    private boolean scanEnabled;

    @Scheduled(cron = "${app.alerts.scan-cron:0 0 6 * * *}")
    @Transactional(readOnly = true)
    public void runDailyExpiryScan() {
        if (!scanEnabled) {
            log.debug("Expiry alert scan disabled (app.alerts.scan-enabled=false)");
            return;
        }

        int horizon = Math.max(horizonDays, 1);
        LocalDate today = LocalDate.now();

        List<Medicine> expired = medicineRepository.findExpiredMedicines(today);
        List<Medicine> expiring = medicineRepository.findExpiringSoon(today, today.plusDays(horizon));
        List<Medicine> lowStock = medicineRepository.findLowStockMedicines();

        log.info("MediTrack expiry scan: {} expired, {} expiring within {}d, {} low stock",
                expired.size(), expiring.size(), horizon, lowStock.size());

        expired.stream().limit(20).forEach(m -> log.warn(
                "EXPIRED: {} (batch {}) expired on {} - {} units still on shelf",
                m.getName(), m.getBatchNumber(), m.getExpiryDate(), m.getQuantity()));

        expiring.stream().limit(20).forEach(m -> log.warn(
                "EXPIRING: {} (batch {}) expires on {} - {} units remaining",
                m.getName(), m.getBatchNumber(), m.getExpiryDate(), m.getQuantity()));

        lowStock.stream().filter(m -> m.getQuantity() == 0).limit(20).forEach(m -> log.warn(
                "OUT OF STOCK: {} (batch {}) is at zero units, minimum level is {}",
                m.getName(), m.getBatchNumber(), m.getMinimumStockLevel()));
    }
}