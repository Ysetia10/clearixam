package com.clearixam.dto.response

import java.time.LocalDate

// ── Feature 1: Subject Analytics Aggregation ──────────────────────────────────
data class SubjectAnalyticsDTO(
    val subjectName: String,
    val avgAccuracy: Double,
    val avgAttemptsPerMock: Double,
    val totalMocksAttempted: Int,
    val lastAttemptedDate: LocalDate?,
    val trend: Double,           // positive = improving, negative = declining
    val status: SubjectStatus
)

enum class SubjectStatus { IMPROVING, DECLINING, STABLE }

data class SubjectAnalyticsListResponse(
    val subjects: List<SubjectAnalyticsDTO>
)

// ── Feature 2: Subject Neglect Detection ──────────────────────────────────────
data class SubjectNeglectDTO(
    val subjectName: String,
    val status: NeglectStatus,
    val lastAttemptedMockIndex: Int,   // 0 = most recent mock, windowSize = not in window
    val appearedInLastN: Int
)

enum class NeglectStatus { NEGLECTED, PARTIALLY_NEGLECTED, ACTIVE }

data class SubjectNeglectResponse(
    val windowSize: Int,
    val subjects: List<SubjectNeglectDTO>
)

// ── Feature 3: Attempt vs Accuracy Tradeoff ───────────────────────────────────
data class AttemptAccuracyInsightDTO(
    val trend: AttemptAccuracyTrend,
    val highAttemptAccuracy: Double,
    val lowAttemptAccuracy: Double,
    val highAttemptAvgRate: Double,
    val lowAttemptAvgRate: Double,
    val insight: String
)

enum class AttemptAccuracyTrend { POSITIVE, NEGATIVE, NEUTRAL }
