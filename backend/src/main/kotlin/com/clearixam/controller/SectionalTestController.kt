package com.clearixam.controller

import com.clearixam.dto.request.CreateSectionalTestRequest
import com.clearixam.dto.response.SectionalAnalyticsResponse
import com.clearixam.dto.response.SectionalTestResponse
import com.clearixam.service.SectionalTestService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/sectional-tests")
class SectionalTestController(
    private val sectionalTestService: SectionalTestService
) {

    @PostMapping
    fun create(
        @Valid @RequestBody request: CreateSectionalTestRequest,
        authentication: Authentication
    ): ResponseEntity<SectionalTestResponse> {
        return ResponseEntity.ok(sectionalTestService.create(authentication.name, request))
    }

    @GetMapping
    fun listByExam(
        @RequestParam examId: UUID,
        authentication: Authentication
    ): ResponseEntity<List<SectionalTestResponse>> {
        return ResponseEntity.ok(sectionalTestService.listByExam(authentication.name, examId))
    }

    @GetMapping("/analytics")
    fun getAnalytics(
        @RequestParam examId: UUID,
        authentication: Authentication
    ): ResponseEntity<SectionalAnalyticsResponse> {
        return ResponseEntity.ok(sectionalTestService.getAnalytics(authentication.name, examId))
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<Void> {
        sectionalTestService.delete(authentication.name, id)
        return ResponseEntity.noContent().build()
    }
}
