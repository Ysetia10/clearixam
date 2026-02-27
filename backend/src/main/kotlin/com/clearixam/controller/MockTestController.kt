package com.clearixam.controller

import com.clearixam.dto.request.CreateMockRequest
import com.clearixam.dto.response.MockDetailResponse
import com.clearixam.dto.response.MockResponse
import com.clearixam.service.MockTestService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/mocks")
class MockTestController(
    private val mockTestService: MockTestService
) {

    @PostMapping
    fun createMock(
        @Valid @RequestBody request: CreateMockRequest,
        authentication: Authentication
    ): ResponseEntity<MockResponse> {
        val userEmail = authentication.name
        val response = mockTestService.createMock(userEmail, request)
        return ResponseEntity.ok(response)
    }

    @GetMapping
    fun getMocks(authentication: Authentication): ResponseEntity<List<MockResponse>> {
        val userEmail = authentication.name
        val mocks = mockTestService.getMocksForUser(userEmail)
        return ResponseEntity.ok(mocks)
    }

    @GetMapping("/{id}")
    fun getMockDetail(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<MockDetailResponse> {
        val userEmail = authentication.name
        val mock = mockTestService.getMockDetail(id, userEmail)
        return ResponseEntity.ok(mock)
    }
}
