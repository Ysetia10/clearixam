package com.clearixam.dto.response

import com.clearixam.enums.ClassificationStatus
import com.clearixam.enums.ClassificationSource

data class ClassificationResult(
    val subject: String,
    val topic: String,
    val confidence: Double,
    val matchedKeywords: List<String>,
    val cleanedText: String,
    val status: ClassificationStatus,
    val needsLLM: Boolean,
    val source: ClassificationSource = ClassificationSource.RULE,
    val difficulty: String? = null,
    val id: Long? = null
)

data class MCQProcessingResponse(
    val subject: String,
    val topic: String,
    val confidence: Double,
    val matchedKeywords: List<String>,
    val cleanedText: String,
    val status: ClassificationStatus,
    val needsLLM: Boolean,
    val source: ClassificationSource,
    val difficulty: String? = null,
    val id: Long? = null,
    val canEdit: Boolean = true
)

data class LLMResult(
    val subject: String,
    val topic: String,
    val difficulty: String,
    val keywords: List<String>
)

data class MCQCorrectionRequest(
    val id: Long,
    val subject: String,
    val topic: String
)

data class MCQCorrectionResponse(
    val id: Long,
    val success: Boolean,
    val message: String,
    val originalClassification: String,
    val correctedClassification: String
)

data class MCQOutcomeRequest(
    val id: Long,
    val outcome: String // "CORRECT", "INCORRECT", "UNATTEMPTED"
)

data class MCQOutcomeResponse(
    val id: Long,
    val success: Boolean,
    val message: String,
    val outcome: String
)

data class TopicPerformanceDTO(
    val subject: String,
    val topic: String,
    val correct: Int,
    val incorrect: Int,
    val unattempted: Int,
    val accuracy: Double
)

data class TopicPerformanceResponse(
    val success: Boolean,
    val data: List<TopicPerformanceDTO>
)