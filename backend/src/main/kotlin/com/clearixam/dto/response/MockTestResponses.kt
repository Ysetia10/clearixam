package com.clearixam.dto.response

import java.time.LocalDate
import java.util.UUID

data class MockResponse(
    val id: UUID,
    val testName: String,
    val examId: UUID,
    val examName: String,
    val testDate: LocalDate,
    val totalScore: Double,
    val cutoffScore: Double,
    val probabilityScore: Double?,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val totalQuestions: Int,
    val marksObtained: Double
)

data class PagedMockResponse(
    val content: List<MockResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int
)

data class MockDetailResponse(
    val id: UUID,
    val testName: String,
    val examId: UUID,
    val examName: String,
    val testDate: LocalDate,
    val totalScore: Double,
    val cutoffScore: Double,
    val probabilityScore: Double?,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val totalQuestions: Int,
    val marksObtained: Double,
    val subjects: List<SubjectDetail>
)

data class SubjectDetail(
    val subjectId: UUID,
    val subjectName: String,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val score: Double
)
