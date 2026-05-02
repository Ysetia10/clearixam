package com.clearixam.service

import com.clearixam.dto.response.ClassificationResult
import com.clearixam.enums.ClassificationStatus
import com.clearixam.enums.ClassificationSource
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class ConfidenceEngine {
    
    private val logger = LoggerFactory.getLogger(ConfidenceEngine::class.java)
    
    private val CONFIDENT_THRESHOLD = 60.0
    private val AMBIGUITY_THRESHOLD = 15.0
    
    fun analyzeConfidence(
        primaryResult: ClassificationResult,
        allCandidates: List<ClassificationCandidate>
    ): ClassificationResult {
        return try {
            logger.debug("Analyzing confidence for classification: ${primaryResult.subject} -> ${primaryResult.topic}")
            
            val decision = makeConfidenceDecision(primaryResult, allCandidates)
            
            logger.info("Confidence analysis: ${decision.status} (confidence: ${primaryResult.confidence}, needsLLM: ${decision.needsLLM})")
            
            primaryResult.copy(
                status = decision.status,
                needsLLM = decision.needsLLM
            )
            
        } catch (e: Exception) {
            logger.error("Confidence analysis failed: ${e.message}", e)
            primaryResult.copy(
                status = ClassificationStatus.LOW_CONFIDENCE,
                needsLLM = true
            )
        }
    }
    
    private fun makeConfidenceDecision(
        primaryResult: ClassificationResult,
        allCandidates: List<ClassificationCandidate>
    ): ConfidenceDecision {
        
        if (primaryResult.subject == "UNKNOWN" || 
            primaryResult.subject == "ERROR" ||
            primaryResult.confidence == 0.0 ||
            primaryResult.matchedKeywords.isEmpty()) {
            
            logger.debug("Edge case detected: Unknown/Error classification or no keywords")
            return ConfidenceDecision(ClassificationStatus.LOW_CONFIDENCE, true)
        }
        
        if (primaryResult.confidence >= CONFIDENT_THRESHOLD) {
            val ambiguityCheck = checkAmbiguity(allCandidates)
            if (ambiguityCheck.isAmbiguous) {
                logger.debug("High confidence but ambiguous results detected")
                return ConfidenceDecision(ClassificationStatus.AMBIGUOUS, true)
            }
            
            logger.debug("High confidence classification")
            return ConfidenceDecision(ClassificationStatus.CONFIDENT, false)
        }
        
        if (primaryResult.confidence < CONFIDENT_THRESHOLD) {
            val ambiguityCheck = checkAmbiguity(allCandidates)
            if (ambiguityCheck.isAmbiguous) {
                logger.debug("Low confidence with ambiguous results")
                return ConfidenceDecision(ClassificationStatus.AMBIGUOUS, true)
            }
            
            logger.debug("Low confidence classification")
            return ConfidenceDecision(ClassificationStatus.LOW_CONFIDENCE, true)
        }
        
        return ConfidenceDecision(ClassificationStatus.LOW_CONFIDENCE, true)
    }
    
    private fun checkAmbiguity(candidates: List<ClassificationCandidate>): AmbiguityResult {
        if (candidates.size < 2) {
            return AmbiguityResult(false, 0.0)
        }
        
        val sortedCandidates = candidates.sortedByDescending { it.confidence }
        val topScore = sortedCandidates[0].confidence
        val secondScore = sortedCandidates[1].confidence
        
        val scoreDifference = topScore - secondScore
        val isAmbiguous = scoreDifference < AMBIGUITY_THRESHOLD
        
        logger.debug("Ambiguity check: top=${topScore}, second=${secondScore}, diff=${scoreDifference}, ambiguous=${isAmbiguous}")
        
        return AmbiguityResult(isAmbiguous, scoreDifference)
    }
    
    fun createConfidentResult(
        subject: String,
        topic: String,
        confidence: Double,
        matchedKeywords: List<String>,
        cleanedText: String,
        allCandidates: List<ClassificationCandidate> = emptyList(),
        source: ClassificationSource = ClassificationSource.RULE,
        difficulty: String? = null
    ): ClassificationResult {
        
        val baseResult = ClassificationResult(
            subject = subject,
            topic = topic,
            confidence = confidence,
            matchedKeywords = matchedKeywords,
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = source,
            difficulty = difficulty
        )
        
        return analyzeConfidence(baseResult, allCandidates)
    }
    
    fun createUnknownResult(reason: String, cleanedText: String): ClassificationResult {
        logger.warn("Creating unknown result: $reason")
        return ClassificationResult(
            subject = "UNKNOWN",
            topic = "UNKNOWN",
            confidence = 0.0,
            matchedKeywords = emptyList(),
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = ClassificationSource.RULE,
            id = null
        )
    }
    
    fun createErrorResult(errorMessage: String, cleanedText: String): ClassificationResult {
        logger.error("Creating error result: $errorMessage")
        return ClassificationResult(
            subject = "ERROR",
            topic = "PROCESSING_FAILED",
            confidence = 0.0,
            matchedKeywords = emptyList(),
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = ClassificationSource.RULE,
            id = null
        )
    }
    
    fun createLLMResult(
        llmResult: com.clearixam.dto.response.LLMResult,
        cleanedText: String,
        originalConfidence: Double = 85.0
    ): ClassificationResult {
        logger.info("Creating LLM-enhanced result: ${llmResult.subject} -> ${llmResult.topic}")
        return ClassificationResult(
            subject = llmResult.subject,
            topic = llmResult.topic,
            confidence = originalConfidence,
            matchedKeywords = llmResult.keywords,
            cleanedText = cleanedText,
            status = ClassificationStatus.LLM_ENHANCED,
            needsLLM = false,
            source = ClassificationSource.LLM,
            difficulty = llmResult.difficulty,
            id = null
        )
    }
    
    fun createFallbackResult(originalResult: ClassificationResult): ClassificationResult {
        logger.warn("Creating fallback result after LLM failure")
        return originalResult.copy(
            status = ClassificationStatus.FALLBACK_RULE,
            needsLLM = false
        )
    }
    
    fun getThresholds(): Map<String, Double> {
        return mapOf(
            "confidentThreshold" to CONFIDENT_THRESHOLD,
            "ambiguityThreshold" to AMBIGUITY_THRESHOLD
        )
    }
    
    data class ClassificationCandidate(
        val subject: String,
        val topic: String,
        val confidence: Double,
        val matchedKeywords: List<String>
    )
    
    private data class ConfidenceDecision(
        val status: ClassificationStatus,
        val needsLLM: Boolean
    )
    
    private data class AmbiguityResult(
        val isAmbiguous: Boolean,
        val scoreDifference: Double
    )
}