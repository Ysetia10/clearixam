package com.clearixam.service

import com.clearixam.dto.response.ClassificationResult
import com.clearixam.enums.ClassificationSource
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

    fun processImage(image: MultipartFile): ClassificationResult {
        return try {
            val rawText = ocrService.extractText(image)

            if (rawText.isBlank()) {
                return confidenceEngine.createUnknownResult("No text could be extracted from the image", "")
            }

            val cleanedText = textPreprocessor.cleanMCQText(rawText)

            if (cleanedText.isBlank()) {
                return confidenceEngine.createUnknownResult("Text preprocessing failed to extract meaningful content", rawText)
            }

            val classificationWithCandidates = ruleBasedClassifier.classifyWithCandidates(cleanedText)
            val confidenceResult = confidenceEngine.analyzeConfidence(
                classificationWithCandidates.primaryResult,
                classificationWithCandidates.allCandidates
            )

            val finalResult = if (confidenceResult.needsLLM && llmService.isAvailable()) {
                applyLLMFallback(confidenceResult, cleanedText)
            } else {
                confidenceResult
            }

            val savedClassification = mcqLearningService.saveClassification(
                questionText = cleanedText,
                subject = finalResult.subject,
                topic = finalResult.topic,
                source = when (finalResult.source) {
                    ClassificationSource.RULE -> com.clearixam.entity.ClassificationSource.RULE
                    ClassificationSource.LLM -> com.clearixam.entity.ClassificationSource.LLM
                },
                confidence = finalResult.confidence,
                matchedKeywords = finalResult.matchedKeywords
            )

            finalResult.copy(cleanedText = cleanedText, id = savedClassification.id)

        } catch (e: Exception) {
            confidenceEngine.createErrorResult("Processing failed: ${e.message}", "")
        }
    }

    fun processText(text: String): ClassificationResult {
        return try {
            if (text.isBlank()) {
                return confidenceEngine.createUnknownResult("Empty text provided", text)
            }

            val cleanedText = textPreprocessor.cleanMCQText(text)

            if (cleanedText.isBlank()) {
                return confidenceEngine.createUnknownResult("Text preprocessing failed", text)
            }

            val classificationWithCandidates = ruleBasedClassifier.classifyWithCandidates(cleanedText)
            val confidenceResult = confidenceEngine.analyzeConfidence(
                classificationWithCandidates.primaryResult,
                classificationWithCandidates.allCandidates
            )

            val finalResult = if (confidenceResult.needsLLM && llmService.isAvailable()) {
                applyLLMFallback(confidenceResult, cleanedText)
            } else {
                confidenceResult
            }

            val savedClassification = mcqLearningService.saveClassification(
                questionText = cleanedText,
                subject = finalResult.subject,
                topic = finalResult.topic,
                source = when (finalResult.source) {
                    ClassificationSource.RULE -> com.clearixam.entity.ClassificationSource.RULE
                    ClassificationSource.LLM -> com.clearixam.entity.ClassificationSource.LLM
                },
                confidence = finalResult.confidence,
                matchedKeywords = finalResult.matchedKeywords
            )

            finalResult.copy(cleanedText = cleanedText, id = savedClassification.id)

        } catch (e: Exception) {
            confidenceEngine.createErrorResult("Text processing failed: ${e.message}", text)
        }
    }

    private fun applyLLMFallback(originalResult: ClassificationResult, cleanedText: String): ClassificationResult {
        return try {
            val llmResult = llmService.classifyWithLLM(cleanedText)
            if (llmResult != null) {
                confidenceEngine.createLLMResult(llmResult, cleanedText)
            } else {
                confidenceEngine.createFallbackResult(originalResult)
            }
        } catch (_: Exception) {
            confidenceEngine.createFallbackResult(originalResult)
        }
    }

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

    fun validateImage(image: MultipartFile): String? {
        return when {
            image.isEmpty -> "Image file is empty"
            image.size > 10 * 1024 * 1024 -> "Image file too large (max 10MB)"
            image.contentType?.startsWith("image/") != true -> "File is not an image"
            else -> null
        }
    }
}
