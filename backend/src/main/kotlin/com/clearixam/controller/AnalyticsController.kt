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
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/analytics")
class AnalyticsController(
    private val analyticsService: AnalyticsService,
    private val examReadinessService: ExamReadinessService,
    private val authService: AuthService
) {

    private val logger = LoggerFactory.getLogger(AnalyticsController::class.java)

    @GetMapping("/overview")
    fun getOverview(authentication: Authentication): ResponseEntity<AnalyticsOverviewResponse> {
        val startTime = System.currentTimeMillis()
        val userEmail = authentication.name
        
        logger.info("Fetching analytics overview for user: $userEmail")
        val overview = analyticsService.getOverview(userEmail)
        
        val duration = System.currentTimeMillis() - startTime
        if (duration > 500) {
            logger.warn("Slow query detected: getOverview took ${duration}ms for user $userEmail")
        }
        
        return ResponseEntity.ok(overview)
    }

    @GetMapping("/trend")
    fun getTrend(authentication: Authentication): ResponseEntity<AnalyticsTrendResponse> {
        val startTime = System.currentTimeMillis()
        val userEmail = authentication.name
        
        logger.info("Fetching analytics trend for user: $userEmail")
        val trend = analyticsService.getTrend(userEmail)
        
        val duration = System.currentTimeMillis() - startTime
        if (duration > 500) {
            logger.warn("Slow query detected: getTrend took ${duration}ms for user $userEmail")
        }
        
        return ResponseEntity.ok(trend)
    }

    @GetMapping("/subjects")
    fun getSubjectAnalytics(authentication: Authentication): ResponseEntity<com.clearixam.dto.response.SubjectAnalyticsResponse> {
        val startTime = System.currentTimeMillis()
        val userEmail = authentication.name
        
        logger.info("Fetching subject analytics for user: $userEmail")
        val subjects = analyticsService.getSubjectAnalytics(userEmail)
        
        val duration = System.currentTimeMillis() - startTime
        if (duration > 500) {
            logger.warn("Slow query detected: getSubjectAnalytics took ${duration}ms for user $userEmail")
        }
        
        return ResponseEntity.ok(subjects)
    }

    @GetMapping("/readiness")
    fun getExamReadiness(authentication: Authentication): ResponseEntity<ExamReadinessResponse> {
        val startTime = System.currentTimeMillis()
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        
        logger.info("Calculating exam readiness for user: $userEmail")
        val readiness = examReadinessService.calculateReadinessScore(user.id!!)
        
        val duration = System.currentTimeMillis() - startTime
        if (duration > 500) {
            logger.warn("Slow query detected: getExamReadiness took ${duration}ms for user $userEmail")
        }
        
        return ResponseEntity.ok(readiness)
    }
}
