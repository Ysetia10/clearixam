package com.clearixam.dto.response

import java.util.UUID

data class ExamResponse(
    val id: UUID,
    val name: String,
    val description: String,
    val maxMarks: Int,
    val maxQuestions: Int,
    val correctMarks: Double,
    val negativeMarks: Double
)

data class SubjectResponse(
    val id: UUID,
    val name: String,
    val examId: UUID,
    val examName: String
)

data class SubjectPerformanceResponse(
    val id: UUID,
    val userId: UUID,
    val examId: UUID,
    val subjectId: UUID,
    val subjectName: String,
    val marks: Double,
    val questionsAttempted: Int,
    val correct: Int,
    val incorrect: Int,
    val accuracy: Double,
    val testDate: String
)
