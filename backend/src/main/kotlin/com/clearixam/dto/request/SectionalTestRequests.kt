package com.clearixam.dto.request

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.PositiveOrZero
import java.time.LocalDate
import java.util.UUID

data class CreateSectionalTestRequest(

    @field:NotNull(message = "Exam ID is required")
    val examId: UUID,

    @field:NotNull(message = "Subject ID is required")
    val subjectId: UUID,

    @field:NotNull(message = "Test date is required")
    val testDate: LocalDate,

    @field:NotNull
    @field:Min(1, message = "Total questions must be at least 1")
    val totalQuestions: Int,

    @field:NotNull
    @field:PositiveOrZero(message = "Attempted must be zero or positive")
    val attempted: Int,

    @field:NotNull
    @field:PositiveOrZero(message = "Correct must be zero or positive")
    val correct: Int,

    @field:NotNull
    @field:Min(1, message = "Time taken must be at least 1 minute")
    val timeTakenMinutes: Int
)
