package com.clearixam.controller

import com.clearixam.dto.response.ExamResponse
import com.clearixam.service.ExamService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/exams")
class ExamController(
    private val examService: ExamService
) {
    private val logger = LoggerFactory.getLogger(ExamController::class.java)

    @GetMapping("/ordered")
    fun getAllExamsOrderedByMockCount(authentication: Authentication): ResponseEntity<List<ExamResponse>> {
        return try {
            val userEmail = authentication.name
            logger.info("GET /api/exams/ordered - Fetching exams ordered by mock count for user: $userEmail")
            val exams = examService.getAllExamsOrderedByMockCount(userEmail)
            logger.info("GET /api/exams/ordered - Successfully fetched ${exams.size} exams ordered by mock count")
            ResponseEntity.ok(exams)
        } catch (e: Exception) {
            logger.error("GET /api/exams/ordered - Error fetching ordered exams", e)
            throw e
        }
    }
}
