package com.clearixam.dto.response

import com.clearixam.entity.SubjectName
import java.time.LocalDate

data class SubjectAnalyticsResponse(
    val subjects: List<SubjectAnalysis>
)

data class SubjectAnalysis(
    val subjectName: SubjectName,
    val averageScore: Double,
    val averageAccuracy: Double,
    val improvementRate: Double,
    val trend: SubjectTrend
)

data class SubjectTrend(
    val dates: List<LocalDate>,
    val scores: List<Double>,
    val accuracy: List<Double>
)
