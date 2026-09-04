package com.clearixam.controller

import com.clearixam.dto.request.SubmitAttemptRequest
import com.clearixam.dto.response.AttemptAnalysisResponse
import com.clearixam.dto.response.AttemptResultResponse
import com.clearixam.dto.response.PaperDetailResponse
import com.clearixam.dto.response.PaperSummaryResponse
import com.clearixam.dto.response.PyqTopicPerformanceResponse
import com.clearixam.dto.response.RecentPyqAttemptResponse
import com.clearixam.dto.response.StartAttemptResponse
import com.clearixam.service.PyqPaperService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api")
class PyqPaperController(
    private val pyqPaperService: PyqPaperService
) {

    @GetMapping("/papers")
    fun listPapers(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<List<PaperSummaryResponse>> =
        ResponseEntity.ok(pyqPaperService.listPapers(authentication.name, examId))

    @GetMapping("/papers/{id}")
    fun getPaper(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<PaperDetailResponse> =
        ResponseEntity.ok(pyqPaperService.getPaperForTaking(id))

    @PostMapping("/papers/{id}/attempts")
    fun startAttempt(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<StartAttemptResponse> =
        ResponseEntity.ok(pyqPaperService.startAttempt(authentication.name, id))

    @GetMapping("/attempts/recent")
    fun listRecentAttempts(
        @RequestParam(required = false) examId: UUID?,
        @RequestParam(defaultValue = "10") limit: Int,
        authentication: Authentication
    ): ResponseEntity<List<RecentPyqAttemptResponse>> =
        ResponseEntity.ok(pyqPaperService.listRecentAttempts(authentication.name, examId, limit))

    @GetMapping("/attempts/topic-performance")
    fun topicPerformance(
        @RequestParam(required = false) examId: UUID?,
        authentication: Authentication
    ): ResponseEntity<PyqTopicPerformanceResponse> =
        ResponseEntity.ok(pyqPaperService.getTopicPerformance(authentication.name, examId))

    @PostMapping("/attempts/{id}/submit")
    fun submitAttempt(
        @PathVariable id: UUID,
        @Valid @RequestBody request: SubmitAttemptRequest,
        authentication: Authentication
    ): ResponseEntity<AttemptResultResponse> =
        ResponseEntity.ok(pyqPaperService.submitAttempt(authentication.name, id, request))

    @GetMapping("/attempts/{id}")
    fun getAttempt(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<AttemptResultResponse> =
        ResponseEntity.ok(pyqPaperService.getAttempt(authentication.name, id))

    @GetMapping("/attempts/{id}/analysis")
    fun getAnalysis(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<AttemptAnalysisResponse> =
        ResponseEntity.ok(pyqPaperService.getAnalysis(authentication.name, id))
}
