package com.nithin.issuetracker.controller;

import com.nithin.issuetracker.dto.Dtos.DashboardDto;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.DashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardDto summary(@AuthenticationPrincipal AppUserDetails me) {
        return dashboardService.summary(me);
    }
}
