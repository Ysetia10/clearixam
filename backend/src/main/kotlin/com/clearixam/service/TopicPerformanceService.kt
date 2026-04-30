package com.clearixam.service

import com.clearixam.dto.response.TopicPerformanceDTO
import com.clearixam.entity.OutcomeStatus
import com.clearixam.repository.MCQClassificationRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import kotlin.math.round

@Service
class TopicPerformanceService(
    private val mcqClassificationRepository: MCQClassificationRepository
) {
    
    private val logger = LoggerFactory.getLogger(TopicPerformanceService::class.java)
    
    /**
     * Get topic-level performance analytics for all classifications
     */
    fun getTopicPerformance(): List<TopicPerformanceDTO> {
        return try {
            logger.info("Calculating topic performance analytics")
            
            // Get all classifications with outcomes
            val classifications = mcqClassificationRepository.findByOutcomeStatusIsNotNull()
            
            if (classifications.isEmpty()) {
                logger.info("No classifications with outcomes found")
                return emptyList()
            }
            
            // Group by subject, topic, subtopic
            val grouped = classifications.groupBy { classification ->
                Triple(
                    classification.subject,
                    classification.topic,
                    classification.subtopic ?: ""
                )
            }
            
            val results = grouped.map { (key, classificationList) ->
                val (subject, topic, subtopic) = key
                
                // Count outcomes
                val correct = classificationList.count { it.outcomeStatus == OutcomeStatus.CORRECT }
                val incorrect = classificationList.count { it.outcomeStatus == OutcomeStatus.INCORRECT }
                val unattempted = classificationList.count { it.outcomeStatus == OutcomeStatus.UNATTEMPTED }
                
                // Calculate accuracy (ignore unattempted)
                val attempted = correct + incorrect
                val accuracy = if (attempted > 0) {
                    round((correct.toDouble() / attempted) * 100 * 10) / 10 // Round to 1 decimal
                } else {
                    0.0
                }
                
                logger.debug("Topic performance: $subject/$topic - correct=$correct, incorrect=$incorrect, unattempted=$unattempted, accuracy=$accuracy%")
                
                TopicPerformanceDTO(
                    subject = subject,
                    topic = topic,
                    subtopic = if (subtopic.isBlank()) null else subtopic,
                    correct = correct,
                    incorrect = incorrect,
                    unattempted = unattempted,
                    accuracy = accuracy
                )
            }
            
            // Sort by accuracy (lowest first) for identifying weak topics
            val sortedResults = results.sortedBy { it.accuracy }
            
            logger.info("Generated topic performance for ${sortedResults.size} topics")
            sortedResults
            
        } catch (e: Exception) {
            logger.error("Failed to calculate topic performance: ${e.message}", e)
            emptyList()
        }
    }
    
    /**
     * Get topic performance grouped by subject
     */
    fun getTopicPerformanceBySubject(): Map<String, List<TopicPerformanceDTO>> {
        return getTopicPerformance().groupBy { it.subject }
    }
    
    /**
     * Get performance statistics summary
     */
    fun getPerformanceSummary(): Map<String, Any> {
        val allPerformance = getTopicPerformance()
        
        if (allPerformance.isEmpty()) {
            return mapOf(
                "totalTopics" to 0,
                "averageAccuracy" to 0.0,
                "weakTopics" to 0,
                "strongTopics" to 0
            )
        }
        
        val totalTopics = allPerformance.size
        val averageAccuracy = allPerformance.map { it.accuracy }.average()
        val weakTopics = allPerformance.count { it.accuracy < 50.0 }
        val strongTopics = allPerformance.count { it.accuracy >= 80.0 }
        
        return mapOf(
            "totalTopics" to totalTopics,
            "averageAccuracy" to round(averageAccuracy * 10) / 10,
            "weakTopics" to weakTopics,
            "strongTopics" to strongTopics
        )
    }
}