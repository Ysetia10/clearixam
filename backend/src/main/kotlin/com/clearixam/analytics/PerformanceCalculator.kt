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

    fun calculateOverallAccuracy(mocks: List<MockTest>): Double {
        if (mocks.isEmpty()) return 0.0
        var totalCorrect = 0
        var totalAttempted = 0
        
        mocks.forEach { mock ->
            mock.subjects.forEach { subject ->
                totalCorrect += subject.correct
                totalAttempted += subject.attempted
            }
        }
        
        return if (totalAttempted > 0) {
            (totalCorrect.toDouble() / totalAttempted) * 100
        } else 0.0
    }

    fun calculateAttemptStrategy(accuracy: Double): AttemptStrategy {
        return when {
            accuracy > 75 -> AttemptStrategy(
                recommendedRange = "85-100 questions",
                note = "High accuracy! Increase attempts to maximize score."
            )
            accuracy >= 60 -> AttemptStrategy(
                recommendedRange = "70-85 questions",
                note = "Good accuracy. Maintain current attempt rate."
            )
            else -> AttemptStrategy(
                recommendedRange = "60-75 questions",
                note = "Focus on accuracy. Reduce attempts and improve fundamentals."
            )
        }
    }

    fun calculateConsistencyScore(mocks: List<MockTest>): ConsistencyLevel {
        if (mocks.size < 2) return ConsistencyLevel.INSUFFICIENT_DATA
        
        val recentMocks = mocks.sortedByDescending { it.testDate }.take(5)
        if (recentMocks.size < 2) return ConsistencyLevel.INSUFFICIENT_DATA
        
        val scores = recentMocks.map { it.totalScore }
        val mean = scores.average()
        val variance = scores.map { (it - mean) * (it - mean) }.average()
        val stdDev = kotlin.math.sqrt(variance)
        
        return when {
            stdDev < 5 -> ConsistencyLevel.HIGH
            stdDev < 10 -> ConsistencyLevel.MODERATE
            else -> ConsistencyLevel.LOW
        }
    }

    fun analyzeSubjects(mocks: List<MockTest>): List<SubjectAnalysisData> {
        if (mocks.isEmpty()) return emptyList()

        val subjectData = mutableMapOf<SubjectName, MutableList<SubjectDataPoint>>()

        mocks.forEach { mock ->
            mock.subjects.forEach { subject ->
                val dataPoints = subjectData.getOrPut(subject.subjectName) { mutableListOf() }
                val accuracy = if (subject.attempted > 0) {
                    (subject.correct.toDouble() / subject.attempted) * 100
                } else 0.0
                
                dataPoints.add(
                    SubjectDataPoint(
                        date = mock.testDate,
                        score = subject.score,
                        accuracy = accuracy
                    )
                )
            }
        }

        return subjectData.map { (subjectName, dataPoints) ->
            val sortedPoints = dataPoints.sortedBy { it.date }
            val avgScore = sortedPoints.map { it.score }.average()
            val avgAccuracy = sortedPoints.map { it.accuracy }.average()
            
            val improvementRate = if (sortedPoints.size >= 2) {
                val oldest = sortedPoints.first().score
                val latest = sortedPoints.last().score
                if (oldest != 0.0) ((latest - oldest) / oldest) * 100 else 0.0
            } else 0.0

            SubjectAnalysisData(
                subjectName = subjectName,
                averageScore = avgScore,
                averageAccuracy = avgAccuracy,
                improvementRate = improvementRate,
                dataPoints = sortedPoints
            )
        }
    }

    data class SubjectAnalysisData(
        val subjectName: SubjectName,
        val averageScore: Double,
        val averageAccuracy: Double,
        val improvementRate: Double,
        val dataPoints: List<SubjectDataPoint>
    )

    data class SubjectDataPoint(
        val date: java.time.LocalDate,
        val score: Double,
        val accuracy: Double
    )

    data class AttemptStrategy(
        val recommendedRange: String,
        val note: String
    )

    enum class ConsistencyLevel {
        HIGH, MODERATE, LOW, INSUFFICIENT_DATA
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
