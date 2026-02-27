package com.clearixam.dto.response

import com.clearixam.analytics.PerformanceCalculator
import com.clearixam.entity.SubjectName
import java.time.LocalDate

data class AnalyticsOverviewResponse(
    val averageScore: Double,
    val movingAverage: Double,
    val improvementRate: Double,
    val probability: Int,
    val riskLevel: PerformanceCalculator.RiskLevel,
    val weakSubjects: List<WeakSubjectResponse>,
    val recommendedAttemptRange: String,
    val strategyNote: String,
    val consistencyScore: PerformanceCalculator.ConsistencyLevel,
    val goalProgress: GoalProgressResponse?,
    val lastFiveAverage: Double,
    val previousFiveAverage: Double,
    val performanceChange: Double
)

data class WeakSubjectResponse(
    val subjectName: SubjectName,
    val accuracy: Double
)

data class AnalyticsTrendResponse(
    val trends: List<TrendPoint>
)

data class TrendPoint(
    val date: LocalDate,
    val score: Double,
    val movingAverage: Double
)
