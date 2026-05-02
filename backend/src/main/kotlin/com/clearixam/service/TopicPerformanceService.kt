package com.clearixam.service

import com.clearixam.dto.response.TopicPerformanceDTO
import com.clearixam.entity.OutcomeStatus
import com.clearixam.repository.MCQClassificationRepository
import org.springframework.stereotype.Service
import kotlin.math.round

@Service
class TopicPerformanceService(
    private val mcqClassificationRepository: MCQClassificationRepository
) {

    fun getTopicPerformance(): List<TopicPerformanceDTO> {
        return try {
            val classifications = mcqClassificationRepository.findByOutcomeStatusIsNotNull()
            if (classifications.isEmpty()) return emptyList()

            val grouped = classifications.groupBy { Pair(it.subject, it.topic) }

            val results = grouped.map { (key, classificationList) ->
                val (subject, topic) = key
                val correct = classificationList.count { it.outcomeStatus == OutcomeStatus.CORRECT }
                val incorrect = classificationList.count { it.outcomeStatus == OutcomeStatus.INCORRECT }
                val unattempted = classificationList.count { it.outcomeStatus == OutcomeStatus.UNATTEMPTED }
                val attempted = correct + incorrect
                val accuracy = if (attempted > 0) round((correct.toDouble() / attempted) * 100 * 10) / 10 else 0.0

                TopicPerformanceDTO(
                    subject = subject,
                    topic = topic,
                    correct = correct,
                    incorrect = incorrect,
                    unattempted = unattempted,
                    accuracy = accuracy
                )
            }

            results.sortedBy { it.accuracy }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun getTopicPerformanceBySubject(): Map<String, List<TopicPerformanceDTO>> {
        return getTopicPerformance().groupBy { it.subject }
    }

    fun getPerformanceSummary(): Map<String, Any> {
        val allPerformance = getTopicPerformance()

        if (allPerformance.isEmpty()) {
            return mapOf("totalTopics" to 0, "averageAccuracy" to 0.0, "weakTopics" to 0, "strongTopics" to 0)
        }

        return mapOf(
            "totalTopics" to allPerformance.size,
            "averageAccuracy" to round(allPerformance.map { it.accuracy }.average() * 10) / 10,
            "weakTopics" to allPerformance.count { it.accuracy < 50.0 },
            "strongTopics" to allPerformance.count { it.accuracy >= 80.0 }
        )
    }
}
