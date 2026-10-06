package com.meditrack.service;

import com.meditrack.dto.InvoiceDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessRead;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * PDF-based invoice extractor using Apache PDFBox.
 * Text-layer PDFs are parsed heuristically; scanned images cannot be read without
 * OCR and fall back to a blank form for manual entry.
 */
@Service
@Slf4j
public class PdfBoxInvoiceExtractor implements InvoiceExtractor {

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy")
    );

    @Override
    public InvoiceDto.ExtractionResult extract(MultipartFile file) throws Exception {
        InvoiceDto.ExtractionResult result = new InvoiceDto.ExtractionResult();
        result.setItems(new ArrayList<>());

        String contentType = file.getContentType();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        if (isPdf(contentType, filename)) {
            return extractFromPdf(file, result);
        } else {
            // Image files - cannot extract without OCR, return blank result for manual filling
            result.setPartialExtraction(true);
            result.setExtractionMessage(
                    "Image invoice uploaded successfully. Automatic text extraction is not available for image files. " +
                    "Please review and enter the invoice details manually below.");
            addBlankItem(result);
            return result;
        }
    }

    private boolean isPdf(String contentType, String filename) {
        return (contentType != null && contentType.contains("pdf")) || filename.endsWith(".pdf");
    }

    private InvoiceDto.ExtractionResult extractFromPdf(MultipartFile file, InvoiceDto.ExtractionResult result) {
        try (InputStream is = file.getInputStream();
             RandomAccessRead randomAccess = new RandomAccessReadBuffer(is);
             PDDocument document = Loader.loadPDF(randomAccess)) {

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);

            log.info("Extracted {} characters from PDF", text != null ? text.length() : 0);

            // Detect scanned PDF (no text layer)
            if (text == null || text.trim().length() < 10) {
                result.setPartialExtraction(true);
                result.setExtractionMessage(
                        "This PDF appears to be a scanned image with no readable text layer. " +
                        "Please enter the invoice details manually below.");
                addBlankItem(result);
                return result;
            }

            // Extract invoice-level fields
            result.setInvoiceNumber(extractInvoiceNumber(text));
            result.setInvoiceDate(extractDate(text, "(?i)(?:invoice|bill|date)[\\s:]+([\\d]{1,2}[/\\-\\.][\\d]{1,2}[/\\-\\.][\\d]{2,4})"));
            result.setSupplierName(extractSupplierName(text));
            result.setSupplierContact(extractPhone(text));
            result.setTotalAmount(extractTotalAmount(text));

            // Extract line items
            List<InvoiceDto.ExtractedItem> items = extractLineItems(text);
            result.setItems(items);

            if (items.isEmpty()) {
                addBlankItem(result);
                result.setPartialExtraction(true);
                result.setExtractionMessage(
                        "Some invoice header fields were extracted. We couldn't identify individual medicine rows automatically. " +
                        "Please add medicine details manually.");
            } else {
                boolean hasPartial = items.stream()
                        .anyMatch(i -> "PARTIAL".equals(i.getExtractionStatus()) || "MISSING".equals(i.getExtractionStatus()));
                result.setPartialExtraction(hasPartial);
                result.setExtractionMessage(hasPartial
                        ? "Invoice partially extracted. Please review highlighted fields and fill in any missing information."
                        : "Invoice extracted successfully. Please review the information before confirming.");
            }

            return result;

        } catch (Exception e) {
            log.error("PDF extraction failed", e);
            result.setPartialExtraction(true);
            result.setExtractionMessage("We couldn't extract the invoice details automatically. Please enter the information manually.");
            addBlankItem(result);
            return result;
        }
    }

    private String extractInvoiceNumber(String text) {
        Pattern p = Pattern.compile("(?i)(?:invoice\\s*(?:no|number|#)[\\s:]+)([A-Z0-9\\-/]+)", Pattern.MULTILINE);
        Matcher m = p.matcher(text);
        return m.find() ? m.group(1).trim() : null;
    }

    private LocalDate extractDate(String text, String regex) {
        Pattern p = Pattern.compile(regex, Pattern.MULTILINE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            return parseDate(m.group(1).trim());
        }
        return null;
    }

    private LocalDate parseDate(String dateStr) {
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return LocalDate.parse(dateStr, fmt);
            } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private String extractSupplierName(String text) {
        Pattern p = Pattern.compile("(?i)(?:supplier|vendor|from|sold by)[\\s:]+([A-Za-z0-9 &.,]+)", Pattern.MULTILINE);
        Matcher m = p.matcher(text);
        if (m.find()) return m.group(1).trim();

        // Fallback: first non-empty line likely to be company name
        String[] lines = text.split("\\n");
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty() && line.length() > 3 && line.length() < 80
                    && !line.matches(".*\\d{5,}.*")) {
                return line;
            }
        }
        return null;
    }

    private String extractPhone(String text) {
        Pattern p = Pattern.compile("(?:phone|mobile|tel|contact)[\\s:]*([+\\d\\s\\-]{8,15})", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        return m.find() ? m.group(1).trim() : null;
    }

    private BigDecimal extractTotalAmount(String text) {
        Pattern p = Pattern.compile("(?i)(?:total|grand total|net total|amount)[\\s:]+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)", Pattern.MULTILINE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return new BigDecimal(m.group(1).replace(",", ""));
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private List<InvoiceDto.ExtractedItem> extractLineItems(String text) {
        List<InvoiceDto.ExtractedItem> items = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;
            if (isHeaderLine(line)) continue;

            InvoiceDto.ExtractedItem item = parseLineItem(line);
            if (item != null && item.getMedicineName() != null && item.getQuantity() != null) {
                item.setExtractionStatus(determineExtractionStatus(item));
                item.setExtractionNotes(buildExtractionNotes(item));
                items.add(item);
            }
        }

        return items;
    }

    /**
     * Token-based line parser. Classifies each whitespace-separated token as a
     * date, batch code, price, quantity, or part of the medicine name. This is
     * far more tolerant of varying invoice column layouts than a single regex.
     */
    private InvoiceDto.ExtractedItem parseLineItem(String line) {
        // Normalize: strip currency symbols/codes, collapse whitespace
        String normalized = line
                .replaceAll("[₹¥€£]", " ")
                .replaceAll("(?i)\\b(Rs\\.?|INR|USD|AED|SAR)\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isEmpty()) return null;

        String[] tokens = normalized.split(" ");

        List<String> nameParts = new ArrayList<>();
        String batch = null;
        Integer quantity = null;
        BigDecimal purchasePrice = null;
        BigDecimal sellingPrice = null;
        LocalDate expiryDate = null;

        int i = 0;
        while (i < tokens.length) {
            String token = tokens[i];
            if (token.isEmpty()) { i++; continue; }

            // Expiry date
            if (expiryDate == null && token.matches("\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}")) {
                LocalDate d = parseDate(token);
                if (d != null) { expiryDate = d; i++; continue; }
            }

            // Batch code: uppercase alphanumeric with dashes/slashes, 3-20 chars,
            // must contain at least one letter and one digit
            if (batch == null && isBatchToken(token)) {
                batch = token;
                i++; continue;
            }

            // Decimal number -> price
            if (token.matches("\\d+\\.\\d+")) {
                BigDecimal val = parseBigDecimal(token);
                if (val != null) {
                    if (purchasePrice == null) purchasePrice = val;
                    else if (sellingPrice == null) sellingPrice = val;
                    i++; continue;
                }
            }

            // Percentage (GST/tax) - skip
            if (token.matches("\\d+(\\.\\d+)?%")) { i++; continue; }

            // Pure integer -> quantity, unless followed by a unit like "mg"
            // (e.g. "500 mg" is part of the medicine name, not the quantity)
            if (token.matches("\\d+")) {
                String nextToken = (i + 1 < tokens.length) ? tokens[i + 1] : "";
                if (isUnitToken(nextToken)) {
                    String afterUnit = (i + 2 < tokens.length) ? tokens[i + 2] : "";
                    if (quantity == null && isStructuralToken(afterUnit)) {
                        quantity = Integer.parseInt(token);
                        i += 2; // consume the integer and its unit
                        continue;
                    }
                    nameParts.add(token);
                    i++; continue;
                }
                if (quantity == null) {
                    quantity = Integer.parseInt(token);
                    i++; continue;
                }
                nameParts.add(token);
                i++; continue;
            }

            // Everything else is part of the medicine name
            nameParts.add(token);
            i++;
        }

        if (nameParts.isEmpty() || quantity == null) return null;

        // Heuristic: if the second decimal equals quantity x purchase price it is
        // the line amount, not a separate selling price
        if (sellingPrice != null && purchasePrice != null) {
            BigDecimal lineAmount = purchasePrice.multiply(BigDecimal.valueOf(quantity));
            if (sellingPrice.compareTo(lineAmount) == 0) {
                sellingPrice = null;
            }
        }

        InvoiceDto.ExtractedItem item = new InvoiceDto.ExtractedItem();
        item.setMedicineName(String.join(" ", nameParts));
        item.setBatchNumber(batch);
        item.setQuantity(quantity);
        item.setPurchasePrice(purchasePrice);
        item.setSellingPrice(sellingPrice);
        item.setExpiryDate(expiryDate);
        return item;
    }

    private boolean isBatchToken(String token) {
        return token.length() >= 3 && token.length() <= 20
                && token.matches("[A-Z0-9][A-Z0-9\\-/]*")
                && token.matches(".*[A-Z].*")
                && token.matches(".*\\d.*");
    }

    private boolean isUnitToken(String token) {
        return token.matches("(?i)(mg|ml|mcg|g|kg|lb|oz|l|units?|tabs?|caps?|tablets?|capsules?|sachets?|vials?|ampoules?|strips?|blisters?)");
    }

    private boolean isStructuralToken(String token) {
        return token.matches("\\d+\\.\\d+") || token.matches("\\d+") || isBatchToken(token)
                || token.matches("\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}");
    }

    private boolean isHeaderLine(String line) {
        String lower = line.toLowerCase();
        boolean hasNumber = line.matches(".*\\d.*");
        boolean isHeaderKeyword = lower.matches(".*\\b(medicine|product|description|item|qty|quantity|price|batch|expiry|total|invoice|supplier|date|amount|tax|gst|subtotal|sub-total|grand|net|sl\\.?\\s*no|s\\.no|discount)\\b.*");

        // Header keyword lines with no numbers are table headers / titles
        if (isHeaderKeyword && !hasNumber) return true;

        // Total / tax / subtotal / discount lines
        if (lower.matches("(?i)^(total|grand total|net total|sub\\s*-?total|subtotal|amount|tax|gst|cgst|sgst|igst|discount)\\s*[:\\-].*")) return true;

        return false;
    }

    private BigDecimal parseBigDecimal(String value) {
        try {
            return new BigDecimal(value.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String determineExtractionStatus(InvoiceDto.ExtractedItem item) {
        if (item.getMedicineName() == null || item.getQuantity() == null) return "MISSING";
        if (item.getExpiryDate() == null || item.getPurchasePrice() == null) return "PARTIAL";
        return "EXTRACTED";
    }

    private String buildExtractionNotes(InvoiceDto.ExtractedItem item) {
        List<String> missing = new ArrayList<>();
        if (item.getBatchNumber() == null) missing.add("batch number");
        if (item.getPurchasePrice() == null) missing.add("purchase price");
        if (item.getExpiryDate() == null) missing.add("expiry date");
        return missing.isEmpty() ? null : "Missing: " + String.join(", ", missing);
    }

    private void addBlankItem(InvoiceDto.ExtractionResult result) {
        InvoiceDto.ExtractedItem blank = new InvoiceDto.ExtractedItem();
        blank.setExtractionStatus("MISSING");
        blank.setExtractionNotes("Please enter medicine details manually");
        result.getItems().add(blank);
    }
}
