package com.clearixam.dto.request

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.PositiveOrZero
import java.time.LocalDate
import java.util.UUID

data class CreateMockRequest(
    @field:NotNull(message = "Test date is required")
    val testDate: LocalDate,

    @field:NotBlank(message = "Test name is required")
    val testName: String = "Mock Test",

    @field:NotNull(message = "Cutoff score is required")
    @field:PositiveOrZero(message = "Cutoff score must be positive")
    val cutoffScore: Double,

    @field:NotNull(message = "Exam ID is required")
    val examId: UUID,

    @field:NotEmpty(message = "At least one subject is required")
    @field:Valid
    val subjects: List<SubjectInput>
)

data class SubjectInput(
    @field:NotNull(message = "Subject ID is required")
    val subjectId: UUID,

    // Optional: sent by frontend for display, ignored server-side
    val subjectName: String? = null,

    @field:NotNull(message = "Attempted count is required")
    @field:PositiveOrZero(message = "Attempted must be positive")
    val attempted: Int,

    @field:NotNull(message = "Correct count is required")
    @field:PositiveOrZero(message = "Correct must be positive")
    val correct: Int
)
