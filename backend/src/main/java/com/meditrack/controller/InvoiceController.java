package com.meditrack.controller;

import com.meditrack.dto.InvoiceDto;
import com.meditrack.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/upload")
    public ResponseEntity<InvoiceDto.ExtractionResult> uploadInvoice(
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(invoiceService.uploadAndExtract(file));
    }

    @PostMapping("/manual")
    public ResponseEntity<InvoiceDto.Response> createManualInvoice(
            @RequestBody InvoiceDto.ManualRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createManualInvoice(request));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<InvoiceDto.Response> confirmInvoice(
            @PathVariable Long id,
            @RequestBody InvoiceDto.ConfirmRequest confirmRequest) {
        return ResponseEntity.ok(invoiceService.confirmInvoice(id, confirmRequest));
    }

    @GetMapping
    public ResponseEntity<Page<InvoiceDto.Response>> getInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(invoiceService.getInvoices(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDto.Response> getInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoice(id));
    }
}
