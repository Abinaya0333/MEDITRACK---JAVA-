package com.meditrack.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices", indexes = {
        @Index(name = "idx_invoice_number", columnList = "invoiceNumber", unique = true),
        @Index(name = "idx_invoice_supplier", columnList = "supplierName"),
        @Index(name = "idx_invoice_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 100)
    private String invoiceNumber;

    private LocalDate invoiceDate;

    @Column(length = 200)
    private String supplierName;

    @Column(length = 200)
    private String supplierContact;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.UPLOADED;

    @Column(length = 500)
    private String filePath;

    @Column(length = 50)
    private String fileType;

    @Column(length = 200)
    private String fileName;

    @Column(columnDefinition = "TEXT")
    private String rawExtractedText;

    @Column(columnDefinition = "TEXT")
    private String extractionNotes;

    @Column(length = 30)
    @Builder.Default
    private String entryMethod = "UPLOAD";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InvoiceItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime confirmedAt;

    public enum InvoiceStatus {
        UPLOADED, PROCESSING, REVIEW_REQUIRED, CONFIRMED, FAILED
    }
}
