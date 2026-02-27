package com.clearixam.dto.request

import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.util.UUID

data class ImportBackupRequest(
    @field:NotNull
    val overwriteExisting: Boolean,
    
    @field:Valid
    @field:NotEmpty
    val mocks: List<MockImportData>,
    
    @field:Valid
    val goals: List<GoalImportData> = emptyList()
)

data class MockImportData(
    val id: UUID?,
    
    @field:NotNull
    val testDate: LocalDate,
    
    @field:NotNull
    val cutoffScore: Double,
    
    @field:Valid
    @field:NotEmpty
    val subjects: List<SubjectImportData>
)

data class SubjectImportData(
    @field:NotNull
    val subjectName: String,
    
    @field:NotNull
    val attempted: Int,
    
    @field:NotNull
    val correct: Int
)

data class GoalImportData(
    val id: UUID?,
    
    @field:NotNull
    val targetScore: Double,
    
    @field:NotNull
    val targetDate: LocalDate
)
