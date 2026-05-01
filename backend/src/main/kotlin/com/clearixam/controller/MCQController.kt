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
            
            // Validate image
            val validationError = mcqProcessingService.validateImage(image)
            if (validationError != null) {
                logger.warn("Image validation failed: $validationError")
                return ResponseEntity.badRequest().body(
                    ApiResponse.error<MCQProcessingResponse>("Invalid image: $validationError")
                )
            }
            
            // Process the image
            val result = mcqProcessingService.processImage(image)
            
            // Check if processing failed
            if (result.subject == "ERROR") {
                logger.error("MCQ processing failed")
                return ResponseEntity.ok(
                    ApiResponse.error<MCQProcessingResponse>("Processing failed")
                )
            }
            
            // Convert to response DTO
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
            
            // Process the text
            val result = mcqProcessingService.processText(text)
            
            // Check if processing failed
            if (result.subject == "ERROR") {
                logger.error("Text processing failed")
                return ResponseEntity.ok(
                    ApiResponse.error<MCQProcessingResponse>("Processing failed")
                )
            }
            
            // Convert to response DTO
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
    
    @GetMapping("/info")
    fun getProcessingInfo(): ResponseEntity<ApiResponse<Map<String, Any>>> {
        return try {
            logger.info("GET /api/mcq/info - Retrieving processing pipeline information")
            val info = mcqProcessingService.getProcessingInfo()
            ResponseEntity.ok(ApiResponse.ok(info))
        } catch (e: Exception) {
            logger.error("Failed to retrieve processing info: ${e.message}", e)
            ResponseEntity.internalServerError().body(
                ApiResponse.error<Map<String, Any>>("Failed to retrieve info: ${e.message}")
            )
        }
    }
    
    @PostMapping("/test-llm")
    fun testLLM(
        @RequestBody request: Map<String, String>
    ): ResponseEntity<ApiResponse<Map<String, Any>>> {
        return try {
            val text = request["text"] ?: "What is GDP in economics?"
            logger.info("POST /api/mcq/test-llm - Testing LLM with text: $text")
            
            val result = mcqProcessingService.processText(text)
            
            val testResult: Map<String, Any> = mapOf(
                "input" to text,
                "result" to mapOf(
                    "subject" to result.subject,
                    "topic" to result.topic,
                    "confidence" to result.confidence,
                    "status" to result.status.name,
                    "source" to result.source.name,
                    "needsLLM" to result.needsLLM,
                    "difficulty" to (result.difficulty ?: "Unknown")
                ),
                "llmAvailable" to (mcqProcessingService.getProcessingInfo()["llmInfo"] ?: mapOf<String, Any>())
            )
            
            ResponseEntity.ok(ApiResponse.ok(testResult))
        } catch (e: Exception) {
            logger.error("LLM test failed: ${e.message}", e)
            ResponseEntity.internalServerError().body(
                ApiResponse.error<Map<String, Any>>("LLM test failed: ${e.message}")
            )
        }
    }
    
    @GetMapping("/health")
    fun healthCheck(): ResponseEntity<ApiResponse<Map<String, String>>> {
        return try {
            val health = mapOf(
                "status" to "UP",
                "pipeline" to "OCR -> Preprocessing -> Classification -> Confidence Analysis -> LLM Fallback",
                "timestamp" to System.currentTimeMillis().toString()
            )
            ResponseEntity.ok(ApiResponse.ok(health))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(
                ApiResponse.error<Map<String, String>>("Health check failed: ${e.message}")
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
    
    @GetMapping("/learning-stats")
    fun getLearningStats(): ResponseEntity<ApiResponse<Map<String, Any>>> {
        return try {
            logger.info("GET /api/mcq/learning-stats - Retrieving learning statistics")
            val stats = mcqLearningService.getLearningStats()
            ResponseEntity.ok(ApiResponse.ok(stats))
        } catch (e: Exception) {
            logger.error("Failed to retrieve learning stats: ${e.message}", e)
            ResponseEntity.internalServerError().body(
                ApiResponse.error<Map<String, Any>>("Failed to retrieve stats: ${e.message}")
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
            
            // Validate outcome
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