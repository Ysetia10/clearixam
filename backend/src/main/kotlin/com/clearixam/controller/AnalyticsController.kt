package com.clearixam.controller

import com.clearixam.analytics.AnalyticsService
import com.clearixam.analytics.SubjectAnalyticsService
import com.clearixam.analytics.AdvancedAnalyticsService
import com.clearixam.dto.response.*
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/analytics")
class AnalyticsController(
    private val analyticsService: AnalyticsService,
    private val subjectAnalyticsService: SubjectAnalyticsService,
    private val advancedAnalyticsService: AdvancedAnalyticsService
) {

    @GetMapping("/overview")
    fun getOverview(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AnalyticsOverviewResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getOverview(authentication.name, examId)))
    }

    @GetMapping("/trend")
    fun getTrend(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AnalyticsTrendResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getTrend(authentication.name, examId)))
    }

    @GetMapping("/subjects")
    fun getSubjectAnalytics(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<SubjectAnalyticsListResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(subjectAnalyticsService.getSubjectAnalytics(authentication.name, examId)))
    }

    @GetMapping("/subjects/neglect")
    fun getSubjectNeglect(
        @RequestParam(required = false) examId: UUID?,
        @RequestParam(required = false, defaultValue = "5") windowSize: Int,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<SubjectNeglectResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(subjectAnalyticsService.getSubjectNeglect(authentication.name, examId, windowSize)))
    }

    @GetMapping("/attempt-accuracy")
    fun getAttemptAccuracyInsight(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AttemptAccuracyInsightDTO>> {
        return ResponseEntity.ok(ApiResponse.ok(subjectAnalyticsService.getAttemptAccuracyInsight(authentication.name, examId)))
    }

    @GetMapping("/improvement")
    fun getImprovement(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<ImprovementDTO>> {
        return ResponseEntity.ok(ApiResponse.ok(advancedAnalyticsService.getImprovement(authentication.name, examId)))
    }

    @GetMapping("/adaptive-strength")
    fun getAdaptiveStrength(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AdaptiveStrengthResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(advancedAnalyticsService.getAdaptiveStrength(authentication.name, examId)))
    }

    @GetMapping("/insights")
    fun getInsights(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<InsightsResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(advancedAnalyticsService.getInsights(authentication.name, examId)))
    }
}
