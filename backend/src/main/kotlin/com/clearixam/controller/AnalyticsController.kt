package com.clearixam.controller

import com.clearixam.analytics.AnalyticsService
import com.clearixam.dto.response.AnalyticsOverviewResponse
import com.clearixam.dto.response.AnalyticsTrendResponse
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/analytics")
class AnalyticsController(
    private val analyticsService: AnalyticsService
) {

    @GetMapping("/overview")
    fun getOverview(authentication: Authentication): ResponseEntity<AnalyticsOverviewResponse> {
        val userEmail = authentication.name
        val overview = analyticsService.getOverview(userEmail)
        return ResponseEntity.ok(overview)
    }

    @GetMapping("/trend")
    fun getTrend(authentication: Authentication): ResponseEntity<AnalyticsTrendResponse> {
        val userEmail = authentication.name
        val trend = analyticsService.getTrend(userEmail)
        return ResponseEntity.ok(trend)
    }

    @GetMapping("/subjects")
    fun getSubjectAnalytics(authentication: Authentication): ResponseEntity<com.clearixam.dto.response.SubjectAnalyticsResponse> {
        val userEmail = authentication.name
        val subjects = analyticsService.getSubjectAnalytics(userEmail)
        return ResponseEntity.ok(subjects)
    }
}
