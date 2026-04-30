package com.clearixam.controller

import com.clearixam.analytics.AnalyticsService
import com.clearixam.analytics.SubjectAnalyticsService
import com.clearixam.analytics.AdvancedAnalyticsService
import com.clearixam.dto.response.*
import com.clearixam.service.ExamReadinessService
import com.clearixam.service.AuthService
import org.slf4j.LoggerFactory
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
    private val advancedAnalyticsService: AdvancedAnalyticsService,
    private val examReadinessService: ExamReadinessService,
    private val authService: AuthService
) {

    private val logger = LoggerFactory.getLogger(AnalyticsController::class.java)

    @GetMapping("/overview")
    fun getOverview(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AnalyticsOverviewResponse>> {
        val userEmail = authentication.name
        logger.info("Fetching analytics overview for user: $userEmail, examId: $examId")
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getOverview(userEmail, examId)))
    }

    @GetMapping("/trend")
    fun getTrend(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AnalyticsTrendResponse>> {
        val userEmail = authentication.name
        logger.info("Fetching analytics trend for user: $userEmail, examId: $examId")
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getTrend(userEmail, examId)))
    }

    @GetMapping("/subjects")
    fun getSubjectAnalytics(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<SubjectAnalyticsListResponse>> {
        val userEmail = authentication.name
        return ResponseEntity.ok(ApiResponse.ok(subjectAnalyticsService.getSubjectAnalytics(userEmail, examId)))
    }

    @GetMapping("/subjects/neglect")
    fun getSubjectNeglect(
        @RequestParam(required = false) examId: UUID?,
        @RequestParam(required = false, defaultValue = "5") windowSize: Int,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<SubjectNeglectResponse>> {
        val userEmail = authentication.name
        return ResponseEntity.ok(ApiResponse.ok(subjectAnalyticsService.getSubjectNeglect(userEmail, examId, windowSize)))
    }

    @GetMapping("/attempt-accuracy")
    fun getAttemptAccuracyInsight(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AttemptAccuracyInsightDTO>> {
        val userEmail = authentication.name
        return ResponseEntity.ok(ApiResponse.ok(subjectAnalyticsService.getAttemptAccuracyInsight(userEmail, examId)))
    }

    @GetMapping("/improvement")
    fun getImprovement(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<ImprovementDTO>> {
        val userEmail = authentication.name
        return ResponseEntity.ok(ApiResponse.ok(advancedAnalyticsService.getImprovement(userEmail, examId)))
    }

    @GetMapping("/adaptive-strength")
    fun getAdaptiveStrength(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<AdaptiveStrengthResponse>> {
        val userEmail = authentication.name
        return ResponseEntity.ok(ApiResponse.ok(advancedAnalyticsService.getAdaptiveStrength(userEmail, examId)))
    }

    @GetMapping("/insights")
    fun getInsights(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<ApiResponse<InsightsResponse>> {
        val userEmail = authentication.name
        return ResponseEntity.ok(ApiResponse.ok(advancedAnalyticsService.getInsights(userEmail, examId)))
    }

    @GetMapping("/readiness")
    fun getExamReadiness(authentication: Authentication): ResponseEntity<ApiResponse<ExamReadinessResponse>> {
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        logger.info("Calculating exam readiness for user: $userEmail")
        return ResponseEntity.ok(ApiResponse.ok(examReadinessService.calculateReadinessScore(user.id!!)))
    }
}
