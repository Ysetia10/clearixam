package com.clearixam.repository

import com.clearixam.entity.MCQClassification
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
interface MCQClassificationRepository : JpaRepository<MCQClassification, Long> {
    
    /**
     * Find all user-corrected classifications for learning
     */
    fun findByUserCorrectedTrue(): List<MCQClassification>
    
    /**
     * Find classifications by question text (for duplicate detection)
     */
    fun findByQuestionText(questionText: String): List<MCQClassification>
    
    /**
     * Find classification by text hash (for duplicate detection)
     */
    fun findByTextHash(textHash: String): MCQClassification?
    
    /**
     * Find recent classifications for analytics
     */
    fun findByCreatedAtAfter(date: LocalDateTime): List<MCQClassification>
    
    /**
     * Count total classifications
     */
    fun countByUserCorrectedTrue(): Long
    
    /**
     * Find classifications with outcomes for performance analytics
     */
    fun findByOutcomeStatusIsNotNull(): List<MCQClassification>
    
    /**
     * Get corrected classifications for specific subject/topic learning
     */
    @Query("SELECT m FROM MCQClassification m WHERE m.userCorrected = true AND m.correctedSubject = :subject")
    fun findCorrectedBySubject(subject: String): List<MCQClassification>
    
    /**
     * Get all corrected classifications with their keywords for learning
     */
    @Query("SELECT m FROM MCQClassification m WHERE m.userCorrected = true AND m.matchedKeywords IS NOT NULL")
    fun findCorrectedWithKeywords(): List<MCQClassification>
}