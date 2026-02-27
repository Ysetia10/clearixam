package com.clearixam.dto.request

import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import java.time.LocalDate

data class CreateGoalRequest(
    @field:NotNull(message = "Target score is required")
    @field:Positive(message = "Target score must be positive")
    val targetScore: Double,

    @field:NotNull(message = "Target date is required")
    val targetDate: LocalDate
)
