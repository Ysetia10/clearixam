package com.clearixam.dto.response

import com.clearixam.entity.SubjectName
import java.time.LocalDate
import java.util.UUID

data class MockResponse(
    val id: UUID,
    val testDate: LocalDate,
    val totalScore: Double,
    val cutoffScore: Double,
    val probabilityScore: Double?
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
    val testDate: LocalDate,
    val totalScore: Double,
    val cutoffScore: Double,
    val probabilityScore: Double?,
    val subjects: List<SubjectDetail>
)

data class SubjectDetail(
    val subjectName: SubjectName,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val score: Double
)
