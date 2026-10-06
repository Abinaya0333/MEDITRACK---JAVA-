package com.meditrack.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class MedicineDto {

    @Data
    public static class Request {
        @NotBlank(message = "Medicine name is required")
        @Size(max = 200)
        private String name;

        @Size(max = 200)
        private String genericName;

        @Size(max = 100)
        private String category;

        @Size(max = 200)
        private String manufacturer;

        @Size(max = 100)
        private String batchNumber;

        @Size(max = 200)
        private String supplier;

        @NotNull(message = "Quantity is required")
        @Min(value = 0, message = "Quantity cannot be negative")
        private Integer quantity;

        @NotNull(message = "Minimum stock level is required")
        @Min(value = 0, message = "Minimum stock level cannot be negative")
        private Integer minimumStockLevel;

        @DecimalMin(value = "0.0", message = "Purchase price cannot be negative")
        private BigDecimal purchasePrice;

        @DecimalMin(value = "0.0", message = "Selling price cannot be negative")
        private BigDecimal sellingPrice;

        private LocalDate expiryDate;
        private LocalDate manufacturingDate;
    }

    @Data
    public static class Response {
        private Long id;
        private String name;
        private String genericName;
        private String category;
        private String manufacturer;
        private String batchNumber;
        private String supplier;
        private Integer quantity;
        private Integer minimumStockLevel;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private LocalDate expiryDate;
        private LocalDate manufacturingDate;
        private String stockStatus;
        private String expiryStatus;
        private Integer daysUntilExpiry;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private String status;
    }

    @Data
    public static class StockUpdateRequest {
        @NotNull(message = "Quantity is required")
        @Min(value = 0, message = "Quantity cannot be negative")
        private Integer quantity;

        @NotBlank(message = "Transaction type is required")
        private String type; // STOCK_IN, STOCK_OUT, ADJUSTMENT

        private String notes;
    }
}
