package com.clearixam.analytics

import com.clearixam.entity.MockTest
import org.springframework.stereotype.Component

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
            totalCorrect += mock.correct
            totalAttempted += mock.attempted
        }
        
        return if (totalAttempted > 0) {
            (totalCorrect.toDouble() / totalAttempted) * 100
        } else 0.0
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

    enum class ConsistencyLevel {
        HIGH, MODERATE, LOW, INSUFFICIENT_DATA
    }

    enum class RiskLevel {
        LOW, MEDIUM, HIGH
    }
}
