package com.clearixam.dto.response

data class ExamReadinessResponse(
    val score: Int, // 0-100
    val status: ReadinessStatus,
    val averageScore: Double,
    val consistency: Double,
    val totalMocks: Int,
    val message: String
)

enum class ReadinessStatus {
    NEEDS_IMPROVEMENT,  // 0-40
    ON_TRACK,           // 41-70
    EXAM_READY          // 71-100
}
