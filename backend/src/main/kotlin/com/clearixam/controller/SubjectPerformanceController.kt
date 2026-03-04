package com.clearixam.controller

import com.clearixam.dto.request.CreateSubjectPerformanceRequest
import com.clearixam.dto.response.SubjectPerformanceResponse
import com.clearixam.service.AuthService
import com.clearixam.service.SubjectPerformanceService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/performance")
class SubjectPerformanceController(
    private val subjectPerformanceService: SubjectPerformanceService,
    private val authService: AuthService
) {

    @PostMapping
    fun createPerformance(
        @Valid @RequestBody request: CreateSubjectPerformanceRequest,
        authentication: Authentication
    ): ResponseEntity<SubjectPerformanceResponse> {
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        
        val performance = subjectPerformanceService.createPerformance(user.id!!, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(performance)
    }

    @GetMapping
    fun getPerformanceByExam(
        @RequestParam examId: UUID,
        authentication: Authentication
    ): ResponseEntity<List<SubjectPerformanceResponse>> {
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        
        val performances = subjectPerformanceService.getPerformanceByExam(user.id!!, examId)
        return ResponseEntity.ok(performances)
    }

    @DeleteMapping("/{id}")
    fun deletePerformance(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<Map<String, String>> {
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        
        subjectPerformanceService.deletePerformance(user.id!!, id)
        return ResponseEntity.ok(mapOf("message" to "Performance record deleted successfully"))
    }
}
