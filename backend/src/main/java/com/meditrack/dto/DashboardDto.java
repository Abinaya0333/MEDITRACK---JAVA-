package com.meditrack.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class DashboardDto {

    @Data
    public static class Summary {
        private long totalMedicines;
        private long totalStock;
        private long lowStockCount;
        private long expiringSoonCount;  // within 30 days
        private long expiredCount;
        private long todaySalesCount;
        private BigDecimal todayRevenue;
        private List<AlertItem> lowStockAlerts;
        private List<AlertItem> expiryAlerts;
        private List<RecentActivity> recentActivity;
        private ExpiryBreakdown expiryBreakdown;
    }

    @Data
    public static class AlertItem {
        private Long id;
        private String medicineName;
        private String batchNumber;
        private Integer quantity;
        private Integer minimumStockLevel;
        private LocalDate expiryDate;
        private Integer daysUntilExpiry;
        private String alertType;
        private String severity;
        private String message;
    }

    @Data
    public static class RecentActivity {
        private String type;
        private String description;
        private LocalDateTime timestamp;
        private String performedBy;
    }

    @Data
    public static class ExpiryBreakdown {
        private long expired;
        private long within7Days;
        private long within15Days;
        private long within30Days;
    }
}
