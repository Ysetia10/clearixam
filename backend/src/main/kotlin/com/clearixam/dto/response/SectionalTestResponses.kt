package com.clearixam.dto.response

import java.time.LocalDate
import java.util.UUID

data class SectionalTestResponse(
    val id: UUID,
    val examId: UUID,
    val examName: String,
    val subjectId: UUID,
    val subjectName: String,
    val testDate: LocalDate,
    val totalQuestions: Int,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val unattempted: Int,
    val timeTakenMinutes: Int,
    val score: Double,
    val accuracy: Double,
    val secondsPerQuestion: Double?,
    val correctMarks: Double,
    val negativeMarks: Double
)

data class SectionalHistoryPoint(
    val id: UUID,
    val testDate: LocalDate,
    val score: Double,
    val accuracy: Double,
    val secondsPerQuestion: Double?,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val unattempted: Int,
    val totalQuestions: Int,
    val timeTakenMinutes: Int
)

data class SectionalSubjectSummary(
    val subjectId: UUID,
    val subjectName: String,
    val totalEntries: Int,
    val latestScore: Double,
    val latestAccuracy: Double,
    val latestSecondsPerQuestion: Double?,
    val bestScore: Double,
    val avgAccuracy: Double,
    val scoreTrend: Double,   // latest 3 avg minus previous 3 avg
    val speedTrend: Double?,  // seconds per question trend (negative = getting faster)
    val history: List<SectionalHistoryPoint>
)

data class SectionalAnalyticsResponse(
    val examId: UUID,
    val examName: String,
    val subjects: List<SectionalSubjectSummary>
)
