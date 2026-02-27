package com.clearixam.analytics

import com.clearixam.entity.MockTest
import com.clearixam.entity.SubjectName
import org.springframework.stereotype.Component
import kotlin.math.roundToInt

@Component
class PerformanceCalculator {

    fun calculateMovingAverage(mocks: List<MockTest>, count: Int = 3): Double {
        if (mocks.isEmpty()) return 0.0
        val recentMocks = mocks.sortedByDescending { it.testDate }.take(count)
        return recentMocks.map { it.totalScore }.average()
    }

    fun calculateOverallAverage(mocks: List<MockTest>): Double {
        if (mocks.isEmpty()) return 0.0
        return mocks.map { it.totalScore }.average()
    }

    fun calculateImprovementRate(mocks: List<MockTest>): Double {
        if (mocks.size < 2) return 0.0
        val sorted = mocks.sortedBy { it.testDate }
        val oldest = sorted.first().totalScore
        val latest = sorted.last().totalScore
        if (oldest == 0.0) return 0.0
        return ((latest - oldest) / oldest) * 100
    }

    fun detectWeakSubjects(mocks: List<MockTest>): List<WeakSubject> {
        if (mocks.isEmpty()) return emptyList()

        val subjectStats = mutableMapOf<SubjectName, SubjectAggregation>()

        mocks.forEach { mock ->
            mock.subjects.forEach { subject ->
                val current = subjectStats.getOrPut(subject.subjectName) {
                    SubjectAggregation(subject.subjectName, 0, 0)
                }
                subjectStats[subject.subjectName] = current.copy(
                    totalCorrect = current.totalCorrect + subject.correct,
                    totalAttempted = current.totalAttempted + subject.attempted
                )
            }
        }

        return subjectStats.values
            .filter { it.totalAttempted > 0 }
            .map { stats ->
                val accuracy = (stats.totalCorrect.toDouble() / stats.totalAttempted) * 100
                val classification = when {
                    accuracy < 60 -> SubjectClassification.WEAK
                    accuracy < 75 -> SubjectClassification.MODERATE
                    else -> SubjectClassification.STRONG
                }
                WeakSubject(stats.subjectName, accuracy, classification)
            }
            .filter { it.classification == SubjectClassification.WEAK }
    }

    fun calculateRiskLevel(movingAverage: Double, cutoffScore: Double): RiskLevel {
        val gap = movingAverage - cutoffScore
        return when {
            gap < 0 -> RiskLevel.HIGH
            gap <= 5 -> RiskLevel.MEDIUM
            else -> RiskLevel.LOW
        }
    }

    fun calculateProbability(movingAverage: Double, cutoffScore: Double): Int {
        val scoreGap = movingAverage - cutoffScore
        return when {
            scoreGap >= 5 -> 85
            scoreGap in 0.0..5.0 -> 70
            scoreGap in -5.0..0.0 -> 50
            else -> 25
        }
    }

    data class SubjectAggregation(
        val subjectName: SubjectName,
        val totalCorrect: Int,
        val totalAttempted: Int
    )

    data class WeakSubject(
        val subjectName: SubjectName,
        val accuracy: Double,
        val classification: SubjectClassification
    )

    enum class SubjectClassification {
        WEAK, MODERATE, STRONG
    }

    enum class RiskLevel {
        LOW, MEDIUM, HIGH
    }
}
