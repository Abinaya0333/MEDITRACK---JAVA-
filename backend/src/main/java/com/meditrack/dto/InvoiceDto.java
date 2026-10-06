package com.meditrack.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class InvoiceDto {

    @Data
    public static class ManualRequest {
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private String supplierName;
        private String supplierContact;
        private BigDecimal totalAmount;
        private List<InvoiceItemRequest> items;
    }

    @Data
    public static class InvoiceItemRequest {
        private Long medicineId;           // optional — if matching existing
        private String medicineName;
        private String genericName;
        private String batchNumber;
        private Integer quantity;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private BigDecimal gstPercent;
        private LocalDate manufacturingDate;
        private LocalDate expiryDate;
        private boolean confirmed = true;
    }

    @Data
    public static class ConfirmRequest {
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private String supplierName;
        private String supplierContact;
        private BigDecimal totalAmount;
        private List<InvoiceItemRequest> items;
    }

    @Data
    public static class Response {
        private Long id;
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private String supplierName;
        private String supplierContact;
        private BigDecimal totalAmount;
        private String status;
        private String fileName;
        private String fileType;
        private String entryMethod;
        private Integer itemCount;
        private String uploadedByName;
        private String createdAt;
        private String confirmedAt;
        private List<InvoiceItemResponse> items;
    }

    @Data
    public static class InvoiceItemResponse {
        private Long id;
        private Long medicineId;
        private String medicineName;
        private String genericName;
        private String batchNumber;
        private Integer quantity;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private BigDecimal gstPercent;
        private LocalDate manufacturingDate;
        private LocalDate expiryDate;
        private String extractionStatus;
        private String extractionNotes;
        private boolean confirmed;
    }

    @Data
    public static class ExtractionResult {
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private String supplierName;
        private String supplierContact;
        private BigDecimal totalAmount;
        private List<ExtractedItem> items;
        private boolean partialExtraction;
        private String extractionMessage;
    }

    @Data
    public static class ExtractedItem {
        private String medicineName;
        private String genericName;
        private String batchNumber;
        private Integer quantity;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private LocalDate manufacturingDate;
        private LocalDate expiryDate;
        private String extractionStatus; // EXTRACTED, PARTIAL, MISSING
        private String extractionNotes;
        private Long possibleMatchId;
        private String possibleMatchName;
    }
}
