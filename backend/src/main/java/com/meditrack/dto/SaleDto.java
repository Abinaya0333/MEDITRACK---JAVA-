package com.meditrack.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class SaleDto {

    @Data
    public static class Request {
        @NotEmpty(message = "Sale must have at least one item")
        private List<SaleItemRequest> items;
        private String notes;
    }

    @Data
    public static class SaleItemRequest {
        @NotNull(message = "Medicine ID is required")
        private Long medicineId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be positive")
        private BigDecimal unitPrice;
    }

    @Data
    public static class Response {
        private Long id;
        private String saleNumber;
        private BigDecimal totalAmount;
        private String notes;
        private String performedByName;
        private LocalDateTime createdAt;
        private List<SaleItemResponse> items;
    }

    @Data
    public static class SaleItemResponse {
        private Long id;
        private Long medicineId;
        private String medicineName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }
}
