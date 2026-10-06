package com.meditrack.service;

import com.meditrack.dto.InvoiceDto;
import org.springframework.web.multipart.MultipartFile;

/**
 * Pluggable invoice extraction interface. Multiple implementations may coexist;
 * Spring injects whichever single bean is active. Only PDF is machine-readable
 * today, so {@link PdfBoxInvoiceExtractor} is the sole provider.
 */
public interface InvoiceExtractor {
    InvoiceDto.ExtractionResult extract(MultipartFile file) throws Exception;
}
