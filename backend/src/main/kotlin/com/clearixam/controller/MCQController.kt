package com.clearixam.controller

import com.clearixam.dto.response.*
import com.clearixam.entity.OutcomeStatus
import com.clearixam.service.MCQProcessingService
import com.clearixam.service.MCQLearningService
import com.clearixam.service.TopicPerformanceService
import org.slf4j.LoggerFactory
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
    
    private val logger = LoggerFactory.getLogger(MCQController::class.java)
    
    @PostMapping("/process")
    fun processImage(
        @RequestParam("image") image: MultipartFile
    ): ResponseEntity<ApiResponse<MCQProcessingResponse>> {
        return try {
            logger.info("POST /api/mcq/process - Processing image: ${image.originalFilename}")
            
            val validationError = mcqProcessingService.validateImage(image)
            if (validationError != null) {
                logger.warn("Image validation failed: $validationError")
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQProcessingResponse>("Invalid image: $validationError")
                )
            }
            
            val result = mcqProcessingService.processImage(image)
            
            if (result.subject == "ERROR") {
                logger.error("MCQ processing failed")
                return ResponseEntity.ok(
                    ApiResponse.error<MCQProcessingResponse>("Processing failed")
                )
            }
            
            val response = MCQProcessingResponse(
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
            )
            
            logger.info("MCQ processing successful: ${result.subject} -> ${result.topic} (${result.confidence}% confidence, Status: ${result.status}, Source: ${result.source})")
            ResponseEntity.ok(ApiResponse.ok(response))
            
        } catch (e: Exception) {
            logger.error("MCQ processing endpoint failed: ${e.message}", e)
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
            logger.info("POST /api/mcq/process-text - Processing text (${text.length} characters)")
            
            if (text.isBlank()) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQProcessingResponse>("Text cannot be empty")
                )
            }
            
            val result = mcqProcessingService.processText(text)
            
            if (result.subject == "ERROR") {
                logger.error("Text processing failed")
                return ResponseEntity.ok(
                    ApiResponse.error<MCQProcessingResponse>("Processing failed")
                )
            }
            
            val response = MCQProcessingResponse(
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
            )
            
            logger.info("Text processing successful: ${result.subject} -> ${result.topic} (${result.confidence}% confidence, Status: ${result.status}, Source: ${result.source})")
            ResponseEntity.ok(ApiResponse.ok(response))
            
        } catch (e: Exception) {
            logger.error("Text processing endpoint failed: ${e.message}", e)
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
            logger.info("POST /api/mcq/correct - Correcting classification ${request.id}: ${request.subject}/${request.topic}")
            
            val corrected = mcqLearningService.correctClassification(
                id = request.id,
                correctedSubject = request.subject,
                correctedTopic = request.topic
            )
            
            if (corrected == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQCorrectionResponse>("Classification not found: ${request.id}")
                )
            }
            
            val response = MCQCorrectionResponse(
                id = corrected.id,
                success = true,
                message = "Classification corrected successfully",
                originalClassification = "${corrected.subject}/${corrected.topic}",
                correctedClassification = "${corrected.correctedSubject}/${corrected.correctedTopic}"
            )
            
            logger.info("Classification correction successful: ${corrected.id} -> ${response.correctedClassification}")
            ResponseEntity.ok(ApiResponse.ok(response))
            
        } catch (e: Exception) {
            logger.error("Classification correction failed: ${e.message}", e)
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
            logger.info("GET /api/mcq/recent-corrections - Retrieving recent corrections (limit: $limit)")
            val corrections = mcqLearningService.getRecentCorrections(limit)
            ResponseEntity.ok(ApiResponse.ok(corrections))
        } catch (e: Exception) {
            logger.error("Failed to retrieve recent corrections: ${e.message}", e)
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
            logger.info("POST /api/mcq/set-outcome - Setting outcome for classification ${request.id}: ${request.outcome}")
            
            val outcomeStatus = try {
                OutcomeStatus.valueOf(request.outcome.uppercase())
            } catch (e: IllegalArgumentException) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQOutcomeResponse>("Invalid outcome: ${request.outcome}. Must be CORRECT, INCORRECT, or UNATTEMPTED")
                )
            }
            
            val updated = mcqLearningService.setOutcome(request.id, outcomeStatus)
            
            if (updated == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQOutcomeResponse>("Classification not found: ${request.id}")
                )
            }
            
            val response = MCQOutcomeResponse(
                id = updated.id,
                success = true,
                message = "Outcome set successfully",
                outcome = outcomeStatus.name
            )
            
            logger.info("Outcome set successfully: ${updated.id} -> ${outcomeStatus.name}")
            ResponseEntity.ok(ApiResponse.ok(response))
            
        } catch (e: Exception) {
            logger.error("Failed to set outcome: ${e.message}", e)
            ResponseEntity.internalServerError().body(
                ApiResponse.error<MCQOutcomeResponse>("Failed to set outcome: ${e.message}")
            )
        }
    }
    
    @GetMapping("/topic-performance")
    fun getTopicPerformance(): ResponseEntity<TopicPerformanceResponse> {
        return try {
            logger.info("GET /api/mcq/topic-performance - Retrieving topic performance analytics")
            val performance = topicPerformanceService.getTopicPerformance()
            ResponseEntity.ok(TopicPerformanceResponse(success = true, data = performance))
        } catch (e: Exception) {
            logger.error("Failed to retrieve topic performance: ${e.message}", e)
            ResponseEntity.internalServerError().body(
                TopicPerformanceResponse(success = false, data = emptyList())
            )
        }
    }
}