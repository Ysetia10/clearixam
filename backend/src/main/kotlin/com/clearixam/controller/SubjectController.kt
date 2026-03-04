package com.clearixam.controller

import com.clearixam.dto.request.CreateSubjectRequest
import com.clearixam.dto.response.SubjectResponse
import com.clearixam.service.SubjectService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/subjects")
class SubjectController(
    private val subjectService: SubjectService
) {

    @GetMapping
    fun getSubjectsByExam(@RequestParam examId: UUID): ResponseEntity<List<SubjectResponse>> {
        val subjects = subjectService.getSubjectsByExam(examId)
        return ResponseEntity.ok(subjects)
    }

    @PostMapping
    fun createSubject(@Valid @RequestBody request: CreateSubjectRequest): ResponseEntity<SubjectResponse> {
        val subject = subjectService.createSubject(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(subject)
    }

    @DeleteMapping("/{id}")
    fun deleteSubject(@PathVariable id: UUID): ResponseEntity<Map<String, String>> {
        subjectService.deleteSubject(id)
        return ResponseEntity.ok(mapOf("message" to "Subject deleted successfully"))
    }
}
