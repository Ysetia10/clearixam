package com.clearixam.dto.response

import java.time.LocalDate
import java.util.UUID

data class GoalResponse(
    val id: UUID,
    val targetScore: Double,
    val targetDate: LocalDate,
    val createdAt: String
)

data class GoalProgressResponse(
    val goalProgressPercent: Double,
    val daysRemaining: Long,
    val onTrack: Boolean,
    val currentScore: Double,
    val targetScore: Double
)
