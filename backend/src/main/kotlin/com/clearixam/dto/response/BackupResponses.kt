package com.clearixam.dto.response

import java.time.LocalDate
import java.util.UUID

data class BackupDataResponse(
    val exportDate: LocalDate,
    val user: UserBackupData,
    val mocks: List<MockBackupData>,
    val goals: List<GoalBackupData>
)

data class UserBackupData(
    val email: String
)

data class MockBackupData(
    val id: UUID,
    val testDate: LocalDate,
    val cutoffScore: Double,
    val totalScore: Double,
    val subjects: List<SubjectBackupData>
)

data class SubjectBackupData(
    val subjectName: String,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val score: Double
)

data class GoalBackupData(
    val id: UUID,
    val targetScore: Double,
    val targetDate: LocalDate,
    val createdAt: java.time.LocalDateTime
)
