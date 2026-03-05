package com.clearixam.controller

import com.clearixam.dto.response.ExamResponse
import com.clearixam.service.ExamService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/exams")
class ExamController(
    private val examService: ExamService
) {
    private val logger = LoggerFactory.getLogger(ExamController::class.java)

    @GetMapping
    fun getAllExams(): ResponseEntity<List<ExamResponse>> {
        return try {
            logger.info("GET /api/exams - Fetching all exams")
            val exams = examService.getAllExams()
            logger.info("GET /api/exams - Successfully fetched ${exams.size} exams")
            ResponseEntity.ok(exams)
        } catch (e: Exception) {
            logger.error("GET /api/exams - Error fetching exams", e)
            throw e
        }
    }

    @GetMapping("/{id}")
    fun getExamById(@PathVariable id: UUID): ResponseEntity<ExamResponse> {
        return try {
            logger.info("GET /api/exams/$id - Fetching exam by id")
            val exam = examService.getExamById(id)
            logger.info("GET /api/exams/$id - Successfully fetched exam: ${exam.name}")
            ResponseEntity.ok(exam)
        } catch (e: Exception) {
            logger.error("GET /api/exams/$id - Error fetching exam", e)
            throw e
        }
    }
}
