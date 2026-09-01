package com.clearixam.dto.response

import com.fasterxml.jackson.annotation.JsonProperty
import java.util.UUID

data class LatestAttemptSummary(
    val attemptId: UUID,
    val totalScore: Double,
    val correctCount: Int,
    val incorrectCount: Int,
    val unattemptedCount: Int,
    val submittedAt: String?
)

data class PaperSummaryResponse(
    val id: UUID,
    val slug: String,
    val title: String,
    val examId: UUID,
    val examName: String,
    val year: Int,
    val slot: String,
    val durationMinutes: Int,
    val questionCount: Int,
    val latestAttempt: LatestAttemptSummary? = null
)

data class PaperQuestionResponse(
    @get:JsonProperty("qNo")
    @param:JsonProperty("qNo")
    val qNo: Int,
    val section: String,
    val sectionCode: String,
    val type: String,
    val stem: String,
    val options: Map<String, String>?,
    val stimulus: String?,
    val setRange: List<Int>?,
    val images: List<String>?,
    val chartDependent: Boolean,
    val topic: String? = null
)

data class PaperDetailResponse(
    val id: UUID,
    val slug: String,
    val title: String,
    val examName: String,
    val year: Int,
    val slot: String,
    val durationMinutes: Int,
    val questionCount: Int,
    val marking: MarkingResponse,
    val questions: List<PaperQuestionResponse>
)

data class MarkingResponse(
    val correct: Double,
    val incorrect: Double,
    val unattempted: Double
)

data class StartAttemptResponse(
    val attemptId: UUID,
    val paper: PaperDetailResponse,
    val startedAt: String,
    val durationMinutes: Int
)

data class SectionScoreResponse(
    val sectionCode: String,
    val section: String,
    val total: Int,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val unattempted: Int,
    val score: Double
)

data class TopicScoreResponse(
    val topic: String,
    val total: Int,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val unattempted: Int,
    val score: Double
)

data class SectionAnalysisResponse(
    val sectionCode: String,
    val section: String,
    val total: Int,
    val attempted: Int,
    val correct: Int,
    val incorrect: Int,
    val unattempted: Int,
    val score: Double,
    val topics: List<TopicScoreResponse>
)

data class AttemptResultResponse(
    val attemptId: UUID,
    val paperId: UUID,
    val paperTitle: String,
    val status: String,
    val startedAt: String,
    val submittedAt: String?,
    val totalScore: Double,
    val correctCount: Int,
    val incorrectCount: Int,
    val unattemptedCount: Int,
    val questionCount: Int,
    val sections: List<SectionScoreResponse>,
    val answers: Map<String, String>
)

data class AttemptAnalysisResponse(
    val attemptId: UUID,
    val paperId: UUID,
    val paperTitle: String,
    val examName: String,
    val submittedAt: String?,
    val totalScore: Double,
    val correctCount: Int,
    val incorrectCount: Int,
    val unattemptedCount: Int,
    val questionCount: Int,
    val topicsTagged: Boolean,
    val sections: List<SectionAnalysisResponse>
)
