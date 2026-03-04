package com.clearixam.controller

import com.clearixam.dto.response.ExamResponse
import com.clearixam.service.ExamService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/exams")
class ExamController(
    private val examService: ExamService
) {

    @GetMapping
    fun getAllExams(): ResponseEntity<List<ExamResponse>> {
        val exams = examService.getAllExams()
        return ResponseEntity.ok(exams)
    }

    @GetMapping("/{id}")
    fun getExamById(@PathVariable id: UUID): ResponseEntity<ExamResponse> {
        val exam = examService.getExamById(id)
        return ResponseEntity.ok(exam)
    }
}
