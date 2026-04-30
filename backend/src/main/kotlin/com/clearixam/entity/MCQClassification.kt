package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "mcq_classifications")
data class MCQClassification(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    
    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    val questionText: String,
    
    @Column(name = "subject", nullable = false)
    val subject: String,
    
    @Column(name = "topic", nullable = false)
    val topic: String,
    
    @Column(name = "subtopic")
    val subtopic: String? = null,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    val source: ClassificationSource,
    
    @Column(name = "confidence", nullable = false)
    val confidence: Double,
    
    @Column(name = "matched_keywords", columnDefinition = "TEXT")
    val matchedKeywords: String? = null, // JSON array as string
    
    @Column(name = "text_hash", nullable = true, unique = true)
    val textHash: String?,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "outcome_status")
    val outcomeStatus: OutcomeStatus? = null,
    
    @Column(name = "user_corrected", nullable = false)
    val userCorrected: Boolean = false,
    
    @Column(name = "corrected_subject")
    val correctedSubject: String? = null,
    
    @Column(name = "corrected_topic")
    val correctedTopic: String? = null,
    
    @Column(name = "corrected_subtopic")
    val correctedSubtopic: String? = null,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "corrected_at")
    val correctedAt: LocalDateTime? = null
)

enum class ClassificationSource {
    RULE,
    LLM
}

enum class OutcomeStatus {
    CORRECT,
    INCORRECT,
    UNATTEMPTED
}