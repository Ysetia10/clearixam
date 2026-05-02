package com.clearixam.controller

import com.clearixam.dto.response.*
import com.clearixam.entity.OutcomeStatus
import com.clearixam.service.MCQProcessingService
import com.clearixam.service.MCQLearningService
import com.clearixam.service.TopicPerformanceService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/mcq")
class MCQController(
    private val mcqProcessingService: MCQProcessingService,
    private val mcqLearningService: MCQLearningService,
    private val topicPerformanceService: TopicPerformanceService
) {

    @PostMapping("/process")
    fun processImage(
        @RequestParam("image") image: MultipartFile
    ): ResponseEntity<ApiResponse<MCQProcessingResponse>> {
        return try {
            val validationError = mcqProcessingService.validateImage(image)
            if (validationError != null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQProcessingResponse>("Invalid image: $validationError")
                )
            }

            val result = mcqProcessingService.processImage(image)

            if (result.subject == "ERROR") {
                return ResponseEntity.ok(ApiResponse.error<MCQProcessingResponse>("Processing failed"))
            }

            ResponseEntity.ok(ApiResponse.ok(MCQProcessingResponse(
                subject = result.subject,
                topic = result.topic,
                confidence = result.confidence,
                matchedKeywords = result.matchedKeywords,
                cleanedText = result.cleanedText,
                status = result.status,
                needsLLM = result.needsLLM,
                source = result.source,
                difficulty = result.difficulty,
                id = result.id,
                canEdit = true
            )))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(
                ApiResponse.error<MCQProcessingResponse>("Internal server error: ${e.message}")
            )
        }
    }

    @PostMapping("/process-text")
    fun processText(
        @RequestBody request: Map<String, String>
    ): ResponseEntity<ApiResponse<MCQProcessingResponse>> {
        return try {
            val text = request["text"] ?: ""

            if (text.isBlank()) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQProcessingResponse>("Text cannot be empty")
                )
            }

            val result = mcqProcessingService.processText(text)

            if (result.subject == "ERROR") {
                return ResponseEntity.ok(ApiResponse.error<MCQProcessingResponse>("Processing failed"))
            }

            ResponseEntity.ok(ApiResponse.ok(MCQProcessingResponse(
                subject = result.subject,
                topic = result.topic,
                confidence = result.confidence,
                matchedKeywords = result.matchedKeywords,
                cleanedText = result.cleanedText,
                status = result.status,
                needsLLM = result.needsLLM,
                source = result.source,
                difficulty = result.difficulty,
                id = result.id,
                canEdit = true
            )))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(
                ApiResponse.error<MCQProcessingResponse>("Internal server error: ${e.message}")
            )
        }
    }

    @PostMapping("/correct")
    fun correctClassification(
        @RequestBody request: MCQCorrectionRequest
    ): ResponseEntity<ApiResponse<MCQCorrectionResponse>> {
        return try {
            val corrected = mcqLearningService.correctClassification(
                id = request.id,
                correctedSubject = request.subject,
                correctedTopic = request.topic
            ) ?: return ResponseEntity.badRequest().body(
                ApiResponse.error<MCQCorrectionResponse>("Classification not found: ${request.id}")
            )

            ResponseEntity.ok(ApiResponse.ok(MCQCorrectionResponse(
                id = corrected.id,
                success = true,
                message = "Classification corrected successfully",
                originalClassification = "${corrected.subject}/${corrected.topic}",
                correctedClassification = "${corrected.correctedSubject}/${corrected.correctedTopic}"
            )))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(
                ApiResponse.error<MCQCorrectionResponse>("Correction failed: ${e.message}")
            )
        }
    }

    @GetMapping("/recent-corrections")
    fun getRecentCorrections(
        @RequestParam(defaultValue = "10") limit: Int
    ): ResponseEntity<ApiResponse<List<Map<String, Any>>>> {
        return try {
            ResponseEntity.ok(ApiResponse.ok(mcqLearningService.getRecentCorrections(limit)))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(
                ApiResponse.error<List<Map<String, Any>>>("Failed to retrieve corrections: ${e.message}")
            )
        }
    }

    @PostMapping("/set-outcome")
    fun setOutcome(
        @RequestBody request: MCQOutcomeRequest
    ): ResponseEntity<ApiResponse<MCQOutcomeResponse>> {
        return try {
            val outcomeStatus = try {
                OutcomeStatus.valueOf(request.outcome.uppercase())
            } catch (e: IllegalArgumentException) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQOutcomeResponse>("Invalid outcome: ${request.outcome}. Must be CORRECT, INCORRECT, or UNATTEMPTED")
                )
            }

            val updated = mcqLearningService.setOutcome(request.id, outcomeStatus)
                ?: return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQOutcomeResponse>("Classification not found: ${request.id}")
                )

            ResponseEntity.ok(ApiResponse.ok(MCQOutcomeResponse(
                id = updated.id,
                success = true,
                message = "Outcome set successfully",
                outcome = outcomeStatus.name
            )))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(
                ApiResponse.error<MCQOutcomeResponse>("Failed to set outcome: ${e.message}")
            )
        }
    }

    @GetMapping("/topic-performance")
    fun getTopicPerformance(): ResponseEntity<TopicPerformanceResponse> {
        return try {
            ResponseEntity.ok(TopicPerformanceResponse(success = true, data = topicPerformanceService.getTopicPerformance()))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(TopicPerformanceResponse(success = false, data = emptyList()))
        }
    }
}
