package com.meditrack.service;

import com.meditrack.dto.InvoiceDto;
import com.meditrack.entity.*;
import com.meditrack.exception.BadRequestException;
import com.meditrack.exception.ResourceNotFoundException;
import com.meditrack.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final UserRepository userRepository;
    private final InvoiceExtractor invoiceExtractor;
    private final MedicineService medicineService;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf", "image/jpeg", "image/jpg", "image/png");
    private static final List<String> ALLOWED_EXTENSIONS = List.of(".pdf", ".jpg", ".jpeg", ".png");

    @Transactional
    public InvoiceDto.ExtractionResult uploadAndExtract(MultipartFile file) throws IOException {
        validateFile(file);

        String filePath = saveFile(file);

        Invoice invoice = Invoice.builder()
                .status(Invoice.InvoiceStatus.PROCESSING)
                .filePath(filePath)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .entryMethod("UPLOAD")
                .uploadedBy(getCurrentUser())
                .build();
        invoice = invoiceRepository.save(invoice);

        try {
            InvoiceDto.ExtractionResult result = invoiceExtractor.extract(file);

            // Save extracted header data back to invoice
            invoice.setInvoiceNumber(result.getInvoiceNumber());
            invoice.setInvoiceDate(result.getInvoiceDate());
            invoice.setSupplierName(result.getSupplierName());
            invoice.setSupplierContact(result.getSupplierContact());
            invoice.setTotalAmount(result.getTotalAmount());
            invoice.setStatus(Invoice.InvoiceStatus.REVIEW_REQUIRED);

            // Persist extracted line items so they appear in the Review screen
            if (result.getItems() != null) {
                for (InvoiceDto.ExtractedItem extracted : result.getItems()) {
                    if (extracted.getMedicineName() == null || extracted.getMedicineName().isBlank()) {
                        continue;
                    }
                    InvoiceItem item = new InvoiceItem();
                    item.setInvoice(invoice);
                    item.setMedicineName(extracted.getMedicineName());
                    item.setGenericName(extracted.getGenericName());
                    item.setBatchNumber(extracted.getBatchNumber());
                    item.setQuantity(extracted.getQuantity() != null ? extracted.getQuantity() : 0);
                    item.setPurchasePrice(extracted.getPurchasePrice());
                    item.setSellingPrice(extracted.getSellingPrice());
                    item.setExpiryDate(extracted.getExpiryDate());
                    item.setExtractionStatus(extracted.getExtractionStatus());
                    item.setExtractionNotes(extracted.getExtractionNotes());
                    item.setConfirmed(false);
                    invoice.getItems().add(item);
                }
            }

            invoice = invoiceRepository.save(invoice);

            // Attach invoice ID to result so frontend can reference it
            result.setExtractionMessage(
                    (result.getExtractionMessage() != null ? result.getExtractionMessage() : "") +
                    "\n[Invoice ID: " + invoice.getId() + "]"
            );

            // Try to match extracted items with existing medicines
            if (result.getItems() != null) {
                for (InvoiceDto.ExtractedItem item : result.getItems()) {
                    if (item.getMedicineName() != null && item.getBatchNumber() != null) {
                        medicineRepository.findByNameIgnoreCaseAndBatchNumberIgnoreCase(
                                item.getMedicineName(), item.getBatchNumber())
                                .ifPresent(m -> {
                                    item.setPossibleMatchId(m.getId());
                                    item.setPossibleMatchName(m.getName() + " (Batch: " + m.getBatchNumber() + ")");
                                });
                    }
                }
            }

            return result;

        } catch (Exception e) {
            log.error("Invoice extraction failed", e);
            invoice.setStatus(Invoice.InvoiceStatus.FAILED);
            invoice.setExtractionNotes("Extraction failed: " + e.getMessage());
            invoiceRepository.save(invoice);

            InvoiceDto.ExtractionResult failResult = new InvoiceDto.ExtractionResult();
            failResult.setPartialExtraction(true);
            failResult.setExtractionMessage("Invoice extraction failed. Please enter details manually.");
            failResult.setItems(new ArrayList<>());
            return failResult;
        }
    }

    @Transactional
    public InvoiceDto.Response createManualInvoice(InvoiceDto.ManualRequest request) {
        Invoice invoice = Invoice.builder()
                .invoiceNumber(request.getInvoiceNumber())
                .invoiceDate(request.getInvoiceDate())
                .supplierName(request.getSupplierName())
                .supplierContact(request.getSupplierContact())
                .totalAmount(request.getTotalAmount())
                .status(Invoice.InvoiceStatus.REVIEW_REQUIRED)
                .entryMethod("MANUAL")
                .uploadedBy(getCurrentUser())
                .build();

        if (request.getItems() != null) {
            for (InvoiceDto.InvoiceItemRequest itemReq : request.getItems()) {
                InvoiceItem item = buildInvoiceItem(invoice, itemReq, "MANUAL");
                invoice.getItems().add(item);
            }
        }

        invoice = invoiceRepository.save(invoice);
        return toResponse(invoice);
    }

    @Transactional
    public InvoiceDto.Response confirmInvoice(Long invoiceId, InvoiceDto.ConfirmRequest confirmRequest) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getStatus() == Invoice.InvoiceStatus.CONFIRMED) {
            throw new BadRequestException("Invoice has already been confirmed");
        }

        // Update invoice header
        if (confirmRequest.getInvoiceNumber() != null) invoice.setInvoiceNumber(confirmRequest.getInvoiceNumber());
        if (confirmRequest.getInvoiceDate() != null) invoice.setInvoiceDate(confirmRequest.getInvoiceDate());
        if (confirmRequest.getSupplierName() != null) invoice.setSupplierName(confirmRequest.getSupplierName());
        if (confirmRequest.getSupplierContact() != null) invoice.setSupplierContact(confirmRequest.getSupplierContact());
        if (confirmRequest.getTotalAmount() != null) invoice.setTotalAmount(confirmRequest.getTotalAmount());

        // Clear and rebuild items
        invoice.getItems().clear();

        if (confirmRequest.getItems() == null || confirmRequest.getItems().isEmpty()) {
            throw new BadRequestException("Invoice must have at least one medicine item");
        }

        for (InvoiceDto.InvoiceItemRequest itemReq : confirmRequest.getItems()) {
            if (itemReq.getMedicineName() == null || itemReq.getMedicineName().isBlank()) {
                throw new BadRequestException("Medicine name is required for all invoice items");
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new BadRequestException("Valid quantity is required for: " + itemReq.getMedicineName());
            }

            InvoiceItem item = buildInvoiceItem(invoice, itemReq, "CONFIRMED");
            invoice.getItems().add(item);
        }

        invoice.setStatus(Invoice.InvoiceStatus.CONFIRMED);
        invoice.setConfirmedAt(LocalDateTime.now());
        invoice = invoiceRepository.save(invoice);

        // Update inventory
        updateInventoryFromInvoice(invoice);

        return toResponse(invoice);
    }

    private void updateInventoryFromInvoice(Invoice invoice) {
        for (InvoiceItem item : invoice.getItems()) {
            Medicine medicine = findOrCreateMedicine(item);
            int prevQty = medicine.getQuantity();
            medicine.setQuantity(prevQty + item.getQuantity());

            // Update medicine details from invoice if missing
            if (medicine.getBatchNumber() == null && item.getBatchNumber() != null)
                medicine.setBatchNumber(item.getBatchNumber());
            if (medicine.getExpiryDate() == null && item.getExpiryDate() != null)
                medicine.setExpiryDate(item.getExpiryDate());
            if (medicine.getPurchasePrice() == null && item.getPurchasePrice() != null)
                medicine.setPurchasePrice(item.getPurchasePrice());
            if (medicine.getSellingPrice() == null && item.getSellingPrice() != null)
                medicine.setSellingPrice(item.getSellingPrice());

            medicine = medicineRepository.save(medicine);
            item.setMedicine(medicine);

            // Record inventory transaction
            InventoryTransaction tx = InventoryTransaction.builder()
                    .medicine(medicine)
                    .type(InventoryTransaction.TransactionType.INVOICE_UPDATE)
                    .quantity(item.getQuantity())
                    .previousQuantity(prevQty)
                    .newQuantity(medicine.getQuantity())
                    .notes("Invoice #" + invoice.getInvoiceNumber() + " - " + invoice.getSupplierName())
                    .referenceNumber(invoice.getInvoiceNumber())
                    .performedBy(invoice.getUploadedBy())
                    .build();
            inventoryTransactionRepository.save(tx);
        }
        invoiceRepository.save(invoice);
    }

    private Medicine findOrCreateMedicine(InvoiceItem item) {
        // Try to find by medicine ID
        if (item.getMedicine() != null && item.getMedicine().getId() != null) {
            return medicineRepository.findById(item.getMedicine().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + item.getMedicine().getId()));
        }

        // Try to match by name + batch
        if (item.getMedicineName() != null && item.getBatchNumber() != null) {
            Optional<Medicine> existing = medicineRepository.findByNameIgnoreCaseAndBatchNumberIgnoreCase(
                    item.getMedicineName(), item.getBatchNumber());
            if (existing.isPresent()) return existing.get();
        }

        // Create new medicine
        return medicineRepository.save(Medicine.builder()
                .name(item.getMedicineName())
                .genericName(item.getGenericName())
                .batchNumber(item.getBatchNumber())
                .quantity(0) // will be updated after
                .minimumStockLevel(10)
                .purchasePrice(item.getPurchasePrice())
                .sellingPrice(item.getSellingPrice())
                .expiryDate(item.getExpiryDate())
                .manufacturingDate(item.getManufacturingDate())
                .build());
    }

    public Page<InvoiceDto.Response> getInvoices(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return invoiceRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    public InvoiceDto.Response getInvoice(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
        return toResponse(invoice);
    }

    // ---- File Handling ----

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new BadRequestException("File is empty");

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("Invalid file type. Allowed: PDF, JPG, JPEG, PNG");
        }

        String filename = file.getOriginalFilename();
        if (filename == null) throw new BadRequestException("Invalid file name");

        String ext = filename.toLowerCase();
        boolean validExt = ALLOWED_EXTENSIONS.stream().anyMatch(ext::endsWith);
        if (!validExt) throw new BadRequestException("Invalid file extension. Allowed: pdf, jpg, jpeg, png");

        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BadRequestException("File size exceeds 10 MB limit");
        }
    }

    private String saveFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        String timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now());
        String filename = timestamp + "_" + Objects.requireNonNull(file.getOriginalFilename()).replaceAll("[^a-zA-Z0-9._-]", "_");
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        return filePath.toString();
    }

    // ---- Builders ----

    private InvoiceItem buildInvoiceItem(Invoice invoice, InvoiceDto.InvoiceItemRequest req, String extractionStatus) {
        InvoiceItem item = new InvoiceItem();
        item.setInvoice(invoice);
        item.setMedicineName(req.getMedicineName());
        item.setGenericName(req.getGenericName());
        item.setBatchNumber(req.getBatchNumber());
        item.setQuantity(req.getQuantity() != null ? req.getQuantity() : 0);
        item.setPurchasePrice(req.getPurchasePrice());
        item.setSellingPrice(req.getSellingPrice());
        item.setGstPercent(req.getGstPercent());
        item.setManufacturingDate(req.getManufacturingDate());
        item.setExpiryDate(req.getExpiryDate());
        item.setExtractionStatus(extractionStatus);
        item.setConfirmed(req.isConfirmed());

        if (req.getMedicineId() != null) {
            Medicine med = new Medicine();
            med.setId(req.getMedicineId());
            item.setMedicine(med);
        }
        return item;
    }

    public InvoiceDto.Response toResponse(Invoice invoice) {
        InvoiceDto.Response r = new InvoiceDto.Response();
        r.setId(invoice.getId());
        r.setInvoiceNumber(invoice.getInvoiceNumber());
        r.setInvoiceDate(invoice.getInvoiceDate());
        r.setSupplierName(invoice.getSupplierName());
        r.setSupplierContact(invoice.getSupplierContact());
        r.setTotalAmount(invoice.getTotalAmount());
        r.setStatus(invoice.getStatus().name());
        r.setFileName(invoice.getFileName());
        r.setFileType(invoice.getFileType());
        r.setEntryMethod(invoice.getEntryMethod());
        r.setItemCount(invoice.getItems() != null ? invoice.getItems().size() : 0);
        r.setUploadedByName(invoice.getUploadedBy() != null ? invoice.getUploadedBy().getFullName() : null);
        r.setCreatedAt(invoice.getCreatedAt() != null ? invoice.getCreatedAt().toString() : null);
        r.setConfirmedAt(invoice.getConfirmedAt() != null ? invoice.getConfirmedAt().toString() : null);

        if (invoice.getItems() != null) {
            r.setItems(invoice.getItems().stream().map(item -> {
                InvoiceDto.InvoiceItemResponse ir = new InvoiceDto.InvoiceItemResponse();
                ir.setId(item.getId());
                ir.setMedicineId(item.getMedicine() != null ? item.getMedicine().getId() : null);
                ir.setMedicineName(item.getMedicineName());
                ir.setGenericName(item.getGenericName());
                ir.setBatchNumber(item.getBatchNumber());
                ir.setQuantity(item.getQuantity());
                ir.setPurchasePrice(item.getPurchasePrice());
                ir.setSellingPrice(item.getSellingPrice());
                ir.setGstPercent(item.getGstPercent());
                ir.setManufacturingDate(item.getManufacturingDate());
                ir.setExpiryDate(item.getExpiryDate());
                ir.setExtractionStatus(item.getExtractionStatus());
                ir.setExtractionNotes(item.getExtractionNotes());
                ir.setConfirmed(item.isConfirmed());
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
