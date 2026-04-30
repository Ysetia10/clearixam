package com.clearixam.service

import com.clearixam.dto.response.ClassificationResult
import com.clearixam.enums.ClassificationSource
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

@Service
class MCQProcessingService(
    private val ocrService: OCRService,
    private val textPreprocessor: TextPreprocessor,
    private val ruleBasedClassifier: RuleBasedClassifier,
    private val confidenceEngine: ConfidenceEngine,
    private val llmService: LLMService,
    private val mcqLearningService: MCQLearningService
) {
    
    private val logger = LoggerFactory.getLogger(MCQProcessingService::class.java)
    
    /**
     * Complete MCQ processing pipeline: Image → OCR → Preprocessing → Classification
     */
    fun processImage(image: MultipartFile): ClassificationResult {
        return try {
            logger.info("Starting MCQ processing pipeline for image: ${image.originalFilename}")
            val startTime = System.currentTimeMillis()
            
            // Step 1: OCR - Extract text from image
            logger.debug("Step 1: Performing OCR extraction")
            val rawText = ocrService.extractText(image)
            
            if (rawText.isBlank()) {
                logger.warn("OCR extraction returned empty text")
                return confidenceEngine.createUnknownResult("No text could be extracted from the image", "")
            }
            
            logger.debug("OCR completed. Extracted ${rawText.length} characters")
            
            // Step 2: Text Preprocessing - Clean the extracted text
            logger.debug("Step 2: Preprocessing extracted text")
            val cleanedText = textPreprocessor.cleanMCQText(rawText)
            
            if (cleanedText.isBlank()) {
                logger.warn("Text preprocessing returned empty result")
                return confidenceEngine.createUnknownResult("Text preprocessing failed to extract meaningful content", rawText)
            }
            
            logger.debug("Text preprocessing completed. Cleaned text: ${cleanedText.take(100)}...")
            
            // Step 3: Classification - Classify the cleaned text
            logger.debug("Step 3: Classifying processed text")
            val classificationWithCandidates = ruleBasedClassifier.classifyWithCandidates(cleanedText)
            
            // Step 4: Confidence Analysis - Determine if LLM fallback is needed
            logger.debug("Step 4: Analyzing confidence and determining LLM fallback need")
            val confidenceResult = confidenceEngine.analyzeConfidence(
                classificationWithCandidates.primaryResult,
                classificationWithCandidates.allCandidates
            )
            
            logger.info("RULE_RESULT subject='${confidenceResult.subject}' topic='${confidenceResult.topic}' confidence=${confidenceResult.confidence} status=${confidenceResult.status} needsLLM=${confidenceResult.needsLLM}")
            
            // Step 5: LLM Fallback (if needed)
            val finalResult = if (confidenceResult.needsLLM && llmService.isAvailable()) {
                logger.info("LLM_FALLBACK_TRIGGERED reason='${confidenceResult.status}' confidence=${confidenceResult.confidence}")
                applyLLMFallback(confidenceResult, cleanedText)
            } else {
                if (confidenceResult.needsLLM) {
                    logger.warn("LLM_FALLBACK_SKIPPED reason=llm_unavailable")
                } else {
                    logger.info("LLM_FALLBACK_SKIPPED reason=high_confidence")
                }
                confidenceResult
            }
            
            val processingTime = System.currentTimeMillis() - startTime
            logger.info("FINAL_RESULT subject='${finalResult.subject}' topic='${finalResult.topic}' source=${finalResult.source} status=${finalResult.status} confidence=${finalResult.confidence} time_ms=$processingTime")
            
            // Save classification for learning
            val savedClassification = mcqLearningService.saveClassification(
                questionText = cleanedText,
                subject = finalResult.subject,
                topic = finalResult.topic,
                subtopic = finalResult.subtopic,
                source = when (finalResult.source) {
                    ClassificationSource.RULE -> com.clearixam.entity.ClassificationSource.RULE
                    ClassificationSource.LLM -> com.clearixam.entity.ClassificationSource.LLM
                },
                confidence = finalResult.confidence,
                matchedKeywords = finalResult.matchedKeywords
            )
            
            // Return result with classification ID
            finalResult.copy(
                cleanedText = cleanedText,
                id = savedClassification.id
            )
            
        } catch (e: Exception) {
            logger.error("MCQ processing pipeline failed: ${e.message}", e)
            confidenceEngine.createErrorResult("Processing failed: ${e.message}", "")
        }
    }
    
    /**
     * Process text directly (bypass OCR step)
     */
    fun processText(text: String): ClassificationResult {
        return try {
            logger.info("Processing text directly (bypassing OCR)")
            
            if (text.isBlank()) {
                return confidenceEngine.createUnknownResult("Empty text provided", text)
            }
            
            // Step 1: Text Preprocessing
            val cleanedText = textPreprocessor.cleanMCQText(text)
            
            if (cleanedText.isBlank()) {
                return confidenceEngine.createUnknownResult("Text preprocessing failed", text)
            }
            
            // Step 2: Classification with candidates
            val classificationWithCandidates = ruleBasedClassifier.classifyWithCandidates(cleanedText)
            
            // Step 3: Confidence Analysis
            val confidenceResult = confidenceEngine.analyzeConfidence(
                classificationWithCandidates.primaryResult,
                classificationWithCandidates.allCandidates
            )
            
            // Step 4: LLM Fallback (if needed)
            val finalResult = if (confidenceResult.needsLLM && llmService.isAvailable()) {
                logger.debug("Applying LLM fallback for text processing")
                applyLLMFallback(confidenceResult, cleanedText)
            } else {
                confidenceResult
            }
            
            logger.info("Text processing completed. Result: ${finalResult.subject} -> ${finalResult.topic} (Status: ${finalResult.status}, Source: ${finalResult.source})")
            
            // Save classification for learning
            val savedClassification = mcqLearningService.saveClassification(
                questionText = cleanedText,
                subject = finalResult.subject,
                topic = finalResult.topic,
                subtopic = finalResult.subtopic,
                source = when (finalResult.source) {
                    ClassificationSource.RULE -> com.clearixam.entity.ClassificationSource.RULE
                    ClassificationSource.LLM -> com.clearixam.entity.ClassificationSource.LLM
                },
                confidence = finalResult.confidence,
                matchedKeywords = finalResult.matchedKeywords
            )
            
            finalResult.copy(
                cleanedText = cleanedText,
                id = savedClassification.id
            )
            
        } catch (e: Exception) {
            logger.error("Text processing failed: ${e.message}", e)
            confidenceEngine.createErrorResult("Text processing failed: ${e.message}", text)
        }
    }
    
    /**
     * Apply LLM fallback when rule-based classification needs enhancement
     */
    private fun applyLLMFallback(originalResult: ClassificationResult, cleanedText: String): ClassificationResult {
        return try {
            logger.info("LLM_FALLBACK_START original_subject='${originalResult.subject}' original_confidence=${originalResult.confidence}")
            
            val llmResult = llmService.classifyWithLLM(cleanedText)
            
            if (llmResult != null) {
                logger.info("LLM_FALLBACK_SUCCESS llm_subject='${llmResult.subject}' llm_topic='${llmResult.topic}'")
                confidenceEngine.createLLMResult(llmResult, cleanedText)
            } else {
                logger.warn("LLM_FALLBACK_FAILED reason=null_result")
                confidenceEngine.createFallbackResult(originalResult)
            }
            
        } catch (e: Exception) {
            logger.error("LLM_FALLBACK_ERROR message='${e.message}'", e)
            confidenceEngine.createFallbackResult(originalResult)
        }
    }
    
    /**
     * Get processing pipeline status and configuration
     */
    fun getProcessingInfo(): Map<String, Any> {
        return mapOf(
            "ocrInfo" to ocrService.getOCRInfo(),
            "availableSubjects" to ruleBasedClassifier.getAvailableSubjects(),
            "pipelineSteps" to listOf("OCR", "Text Preprocessing", "Rule-Based Classification", "Confidence Analysis", "LLM Fallback"),
            "supportedImageTypes" to listOf("JPEG", "PNG", "BMP", "TIFF", "GIF"),
            "confidenceThresholds" to confidenceEngine.getThresholds(),
            "llmInfo" to llmService.getServiceInfo()
        )
    }
    
    /**
     * Validate image file before processing
     */
    fun validateImage(image: MultipartFile): String? {
        return when {
            image.isEmpty -> "Image file is empty"
            image.size > 10 * 1024 * 1024 -> "Image file too large (max 10MB)"
            image.contentType?.startsWith("image/") != true -> "File is not an image"
            else -> null // Valid
        }
    }
}