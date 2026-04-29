package com.clearixam.controller

import com.clearixam.analytics.AnalyticsService
import com.clearixam.dto.response.AnalyticsOverviewResponse
import com.clearixam.dto.response.AnalyticsTrendResponse
import com.clearixam.dto.response.ExamReadinessResponse
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
    private val examReadinessService: ExamReadinessService,
    private val authService: AuthService
) {

    private val logger = LoggerFactory.getLogger(AnalyticsController::class.java)

    @GetMapping("/overview")
    fun getOverview(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<AnalyticsOverviewResponse> {
        val userEmail = authentication.name
        logger.info("Fetching analytics overview for user: $userEmail, examId: $examId")
        return ResponseEntity.ok(analyticsService.getOverview(userEmail, examId))
    }

    @GetMapping("/trend")
    fun getTrend(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<AnalyticsTrendResponse> {
        val userEmail = authentication.name
        logger.info("Fetching analytics trend for user: $userEmail, examId: $examId")
        return ResponseEntity.ok(analyticsService.getTrend(userEmail, examId))
    }

    @GetMapping("/subjects")
    fun getSubjectAnalytics(authentication: Authentication): ResponseEntity<com.clearixam.dto.response.SubjectAnalyticsResponse> {
        val userEmail = authentication.name
        return ResponseEntity.ok(analyticsService.getSubjectAnalytics(userEmail))
    }

    @GetMapping("/readiness")
    fun getExamReadiness(authentication: Authentication): ResponseEntity<ExamReadinessResponse> {
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        logger.info("Calculating exam readiness for user: $userEmail")
        return ResponseEntity.ok(examReadinessService.calculateReadinessScore(user.id!!))
    }
}
