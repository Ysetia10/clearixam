package com.clearixam.service

import com.clearixam.dto.response.ClassificationResult
import com.clearixam.enums.ClassificationStatus
import com.clearixam.enums.ClassificationSource
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class ConfidenceEngine {
    
    private val logger = LoggerFactory.getLogger(ConfidenceEngine::class.java)
    
    // Confidence thresholds
    private val CONFIDENT_THRESHOLD = 60.0 // 60%
    private val AMBIGUITY_THRESHOLD = 15.0 // 15% difference
    
    /**
     * Analyze classification result and determine if LLM fallback is needed
     */
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
            // Fallback to low confidence requiring LLM
            primaryResult.copy(
                status = ClassificationStatus.LOW_CONFIDENCE,
                needsLLM = true
            )
        }
    }
    
    /**
     * Make confidence decision based on multiple criteria
     */
    private fun makeConfidenceDecision(
        primaryResult: ClassificationResult,
        allCandidates: List<ClassificationCandidate>
    ): ConfidenceDecision {
        
        // Edge case: No keywords found or unknown classification
        if (primaryResult.subject == "UNKNOWN" || 
            primaryResult.subject == "ERROR" ||
            primaryResult.confidence == 0.0 ||
            primaryResult.matchedKeywords.isEmpty()) {
            
            logger.debug("Edge case detected: Unknown/Error classification or no keywords")
            return ConfidenceDecision(ClassificationStatus.LOW_CONFIDENCE, true)
        }
        
        // Rule 1: Confidence threshold check
        if (primaryResult.confidence >= CONFIDENT_THRESHOLD) {
            // High confidence, but still check for ambiguity
            val ambiguityCheck = checkAmbiguity(allCandidates)
            if (ambiguityCheck.isAmbiguous) {
                logger.debug("High confidence but ambiguous results detected")
                return ConfidenceDecision(ClassificationStatus.AMBIGUOUS, true)
            }
            
            logger.debug("High confidence classification")
            return ConfidenceDecision(ClassificationStatus.CONFIDENT, false)
        }
        
        // Rule 2: Low confidence check
        if (primaryResult.confidence < CONFIDENT_THRESHOLD) {
            // Check if it's ambiguous or just low confidence
            val ambiguityCheck = checkAmbiguity(allCandidates)
            if (ambiguityCheck.isAmbiguous) {
                logger.debug("Low confidence with ambiguous results")
                return ConfidenceDecision(ClassificationStatus.AMBIGUOUS, true)
            }
            
            logger.debug("Low confidence classification")
            return ConfidenceDecision(ClassificationStatus.LOW_CONFIDENCE, true)
        }
        
        // Fallback
        return ConfidenceDecision(ClassificationStatus.LOW_CONFIDENCE, true)
    }
    
    /**
     * Check for ambiguity between top classification candidates
     */
    private fun checkAmbiguity(candidates: List<ClassificationCandidate>): AmbiguityResult {
        if (candidates.size < 2) {
            return AmbiguityResult(false, 0.0)
        }
        
        // Sort by confidence descending
        val sortedCandidates = candidates.sortedByDescending { it.confidence }
        val topScore = sortedCandidates[0].confidence
        val secondScore = sortedCandidates[1].confidence
        
        val scoreDifference = topScore - secondScore
        val isAmbiguous = scoreDifference < AMBIGUITY_THRESHOLD
        
        logger.debug("Ambiguity check: top=${topScore}, second=${secondScore}, diff=${scoreDifference}, ambiguous=${isAmbiguous}")
        
        return AmbiguityResult(isAmbiguous, scoreDifference)
    }
    
    /**
     * Create classification result with confidence analysis
     */
    fun createConfidentResult(
        subject: String,
        topic: String,
        subtopic: String,
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
            subtopic = subtopic,
            confidence = confidence,
            matchedKeywords = matchedKeywords,
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE, // Will be updated
            needsLLM = true, // Will be updated
            source = source,
            difficulty = difficulty
        )
        
        return analyzeConfidence(baseResult, allCandidates)
    }
    
    /**
     * Create unknown/error result that always needs LLM
     */
    fun createUnknownResult(reason: String, cleanedText: String): ClassificationResult {
        logger.warn("Creating unknown result: $reason")
        return ClassificationResult(
            subject = "UNKNOWN",
            topic = "UNKNOWN",
            subtopic = reason,
            confidence = 0.0,
            matchedKeywords = emptyList(),
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = ClassificationSource.RULE,
            id = null
        )
    }
    
    /**
     * Create error result that always needs LLM
     */
    fun createErrorResult(errorMessage: String, cleanedText: String): ClassificationResult {
        logger.error("Creating error result: $errorMessage")
        return ClassificationResult(
            subject = "ERROR",
            topic = "PROCESSING_FAILED",
            subtopic = errorMessage,
            confidence = 0.0,
            matchedKeywords = emptyList(),
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = ClassificationSource.RULE,
            id = null
        )
    }
    
    /**
     * Create LLM-enhanced result
     */
    fun createLLMResult(
        llmResult: com.clearixam.dto.response.LLMResult,
        cleanedText: String,
        originalConfidence: Double = 85.0
    ): ClassificationResult {
        logger.info("Creating LLM-enhanced result: ${llmResult.subject} -> ${llmResult.topic}")
        return ClassificationResult(
            subject = llmResult.subject,
            topic = llmResult.topic,
            subtopic = llmResult.subtopic,
            confidence = originalConfidence, // LLM results get high confidence
            matchedKeywords = llmResult.keywords,
            cleanedText = cleanedText,
            status = ClassificationStatus.LLM_ENHANCED,
            needsLLM = false, // Already processed by LLM
            source = ClassificationSource.LLM,
            difficulty = llmResult.difficulty,
            id = null // Will be set when saved
        )
    }
    
    /**
     * Create fallback rule result when LLM fails
     */
    fun createFallbackResult(originalResult: ClassificationResult): ClassificationResult {
        logger.warn("Creating fallback result after LLM failure")
        return originalResult.copy(
            status = ClassificationStatus.FALLBACK_RULE,
            needsLLM = false // Don't retry LLM
        )
    }
    
    /**
     * Get confidence thresholds for debugging/configuration
     */
    fun getThresholds(): Map<String, Double> {
        return mapOf(
            "confidentThreshold" to CONFIDENT_THRESHOLD,
            "ambiguityThreshold" to AMBIGUITY_THRESHOLD
        )
    }
    
    // Data classes for internal use
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