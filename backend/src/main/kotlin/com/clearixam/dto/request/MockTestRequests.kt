package com.clearixam.dto.request

import com.clearixam.entity.SubjectName
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.PositiveOrZero
import java.time.LocalDate

data class CreateMockRequest(
    @field:NotNull(message = "Test date is required")
    val testDate: LocalDate,

    @field:NotNull(message = "Cutoff score is required")
    @field:PositiveOrZero(message = "Cutoff score must be positive")
    val cutoffScore: Double,

    @field:NotEmpty(message = "At least one subject is required")
    @field:Valid
    val subjects: List<SubjectInput>
)

data class SubjectInput(
    @field:NotNull(message = "Subject name is required")
    val subjectName: SubjectName,

    @field:NotNull(message = "Attempted count is required")
    @field:PositiveOrZero(message = "Attempted must be positive")
    val attempted: Int,

    @field:NotNull(message = "Correct count is required")
    @field:PositiveOrZero(message = "Correct must be positive")
    val correct: Int
)
