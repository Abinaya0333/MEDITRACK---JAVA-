package com.meditrack.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "invoice_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @Column(length = 200)
    private String medicineName;

    @Column(length = 200)
    private String genericName;

    @Column(length = 100)
    private String batchNumber;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal sellingPrice;

    @Column(precision = 5, scale = 2)
    private BigDecimal gstPercent;

    private LocalDate manufacturingDate;

    private LocalDate expiryDate;

    @Column(length = 50)
    @Builder.Default
    private String extractionStatus = "MANUAL";

    @Column(columnDefinition = "TEXT")
    private String extractionNotes;

    @Column(nullable = false)
    @Builder.Default
    private boolean confirmed = false;
}
