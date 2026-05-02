package com.clearixam.controller

import com.clearixam.dto.response.ExamResponse
import com.clearixam.service.ExamService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/exams")
class ExamController(
    private val examService: ExamService
) {
    @GetMapping("/ordered")
    fun getAllExamsOrderedByMockCount(authentication: Authentication): ResponseEntity<List<ExamResponse>> {
        return ResponseEntity.ok(examService.getAllExamsOrderedByMockCount(authentication.name))
    }
}
