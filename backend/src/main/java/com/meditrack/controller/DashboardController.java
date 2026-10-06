package com.meditrack.controller;

import com.meditrack.dto.DashboardDto;
import com.meditrack.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardDto.Summary> getSummary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }
}
