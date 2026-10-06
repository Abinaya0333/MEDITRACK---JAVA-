package com.meditrack.controller;

import com.meditrack.dto.SaleDto;
import com.meditrack.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    public ResponseEntity<SaleDto.Response> recordSale(@Valid @RequestBody SaleDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(saleService.recordSale(request));
    }

    @GetMapping
    public ResponseEntity<Page<SaleDto.Response>> getSales(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(saleService.getSales(page, size));
    }
}
