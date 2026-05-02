package com.clearixam.repository

import com.clearixam.entity.MCQClassification
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
interface MCQClassificationRepository : JpaRepository<MCQClassification, Long> {
    
    fun findByUserCorrectedTrue(): List<MCQClassification>
    
    fun findByQuestionText(questionText: String): List<MCQClassification>
    
    fun findByTextHash(textHash: String): MCQClassification?
    
    fun findByCreatedAtAfter(date: LocalDateTime): List<MCQClassification>
    
    fun countByUserCorrectedTrue(): Long
    
    fun findByOutcomeStatusIsNotNull(): List<MCQClassification>
    
    @Query("SELECT m FROM MCQClassification m WHERE m.userCorrected = true AND m.correctedSubject = :subject")
    fun findCorrectedBySubject(subject: String): List<MCQClassification>
    
    @Query("SELECT m FROM MCQClassification m WHERE m.userCorrected = true AND m.matchedKeywords IS NOT NULL")
    fun findCorrectedWithKeywords(): List<MCQClassification>
}