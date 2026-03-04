package com.clearixam.dto.request

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.util.UUID

data class SetActiveExamRequest(
    @field:NotNull(message = "Exam ID is required")
    val examId: UUID
)

data class CreateSubjectRequest(
    @field:NotBlank(message = "Subject name is required")
    val name: String,
    
    @field:NotNull(message = "Exam ID is required")
    val examId: UUID
)

data class CreateSubjectPerformanceRequest(
    @field:NotNull(message = "Exam ID is required")
    val examId: UUID,
    
    @field:NotNull(message = "Subject ID is required")
    val subjectId: UUID,
    
    @field:NotNull(message = "Marks is required")
    @field:Min(value = 0, message = "Marks must be non-negative")
    val marks: Double,
    
    @field:NotNull(message = "Questions attempted is required")
    @field:Min(value = 0, message = "Questions attempted must be non-negative")
    val questionsAttempted: Int,
    
    @field:NotNull(message = "Correct answers is required")
    @field:Min(value = 0, message = "Correct answers must be non-negative")
    val correct: Int,
    
    @field:NotNull(message = "Incorrect answers is required")
    @field:Min(value = 0, message = "Incorrect answers must be non-negative")
    val incorrect: Int,
    
    @field:NotNull(message = "Test date is required")
    val testDate: LocalDate
)
