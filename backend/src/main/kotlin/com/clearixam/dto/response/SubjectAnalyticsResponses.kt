package com.clearixam.dto.response

import java.time.LocalDate

data class SubjectAnalyticsDTO(
    val subjectName: String,
    val avgAccuracy: Double,
    val avgAttemptsPerMock: Double,
    val totalMocksAttempted: Int,
    val lastAttemptedDate: LocalDate?,
    val trend: Double,
    val status: SubjectStatus
)

enum class SubjectStatus { IMPROVING, DECLINING, STABLE }

data class SubjectAnalyticsListResponse(
    val subjects: List<SubjectAnalyticsDTO>
)

data class SubjectNeglectDTO(
    val subjectName: String,
    val status: NeglectStatus,
    val lastAttemptedMockIndex: Int,
    val appearedInLastN: Int
)

enum class NeglectStatus { NEGLECTED, PARTIALLY_NEGLECTED, ACTIVE }

data class SubjectNeglectResponse(
    val windowSize: Int,
    val subjects: List<SubjectNeglectDTO>
)

data class AttemptAccuracyInsightDTO(
    val trend: AttemptAccuracyTrend,
    val highAttemptAccuracy: Double,
    val lowAttemptAccuracy: Double,
    val highAttemptAvgRate: Double,
    val lowAttemptAvgRate: Double,
    val insight: String
)

enum class AttemptAccuracyTrend { POSITIVE, NEGATIVE, NEUTRAL }

data class ImprovementDTO(
    val improvementRate: Double,
    val trend: ImprovementTrend,
    val last5Avg: Double,
    val prev5Avg: Double
)

enum class ImprovementTrend { IMPROVING, DECLINING, STABLE }

data class AdaptiveSubjectStrengthDTO(
    val subjectName: String,
    val accuracy: Double,
    val relativeScore: Double,
    val status: SubjectStrengthStatus
)

enum class SubjectStrengthStatus { WEAK, BELOW_AVERAGE, AVERAGE, STRONG }

data class AdaptiveStrengthResponse(
    val overallAccuracy: Double,
    val subjects: List<AdaptiveSubjectStrengthDTO>
)

data class InsightDTO(
    val type: InsightType,
    val message: String
)

enum class InsightType { WARNING, INFO, SUCCESS }

data class InsightsResponse(
    val insights: List<InsightDTO>
)