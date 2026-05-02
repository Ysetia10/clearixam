package com.clearixam.analytics

import com.clearixam.dto.response.*
import com.clearixam.entity.SubjectScore
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.SubjectScoreRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.abs
import kotlin.math.roundToInt

@Service
class SubjectAnalyticsService(
    private val mockTestRepository: MockTestRepository,
    private val subjectScoreRepository: SubjectScoreRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getSubjectAnalytics(userEmail: String, examId: UUID?): SubjectAnalyticsListResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: return SubjectAnalyticsListResponse(emptyList())

        val resolvedExamId = examId ?: user.activeExam?.id
            ?: return SubjectAnalyticsListResponse(emptyList())

        val allScores: List<SubjectScore> =
            subjectScoreRepository.findByUserIdAndExamId(user.id!!, resolvedExamId)

        if (allScores.isEmpty()) return SubjectAnalyticsListResponse(emptyList())

        val result = allScores
            .groupBy { it.subjectName }
            .map { (name, scores) ->
                val totalAttempted = scores.sumOf { it.attempted }
                val totalCorrect   = scores.sumOf { it.correct }

                val avgAccuracy       = safeAccuracy(totalCorrect, totalAttempted)
                val avgAttemptsPerMock = round2(totalAttempted.toDouble() / scores.size)
                val lastAttemptedDate  = scores.first().mockTest.testDate

                val trend  = subjectTrend(scores)
                val status = when {
                    trend > 5.0  -> SubjectStatus.IMPROVING
                    trend < -5.0 -> SubjectStatus.DECLINING
                    else         -> SubjectStatus.STABLE
                }

                SubjectAnalyticsDTO(
                    subjectName          = name,
                    avgAccuracy          = round2(avgAccuracy),
                    avgAttemptsPerMock   = avgAttemptsPerMock,
                    totalMocksAttempted  = scores.size,
                    lastAttemptedDate    = lastAttemptedDate,
                    trend                = round2(trend),
                    status               = status
                )
            }
            .sortedBy { it.avgAccuracy }

        return SubjectAnalyticsListResponse(result)
    }

    private fun subjectTrend(scores: List<SubjectScore>): Double {
        if (scores.size < 5) return 0.0
        val last5     = scores.take(5)
        val previous5 = scores.drop(5).take(5)
        if (previous5.isEmpty()) return 0.0
        return groupAccuracy(last5) - groupAccuracy(previous5)
    }

    private fun groupAccuracy(scores: List<SubjectScore>): Double {
        val attempted = scores.sumOf { it.attempted }
        val correct   = scores.sumOf { it.correct }
        return safeAccuracy(correct, attempted)
    }

    @Transactional(readOnly = true)
    fun getSubjectNeglect(userEmail: String, examId: UUID?, windowSize: Int = 5): SubjectNeglectResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: return SubjectNeglectResponse(windowSize, emptyList())

        val resolvedExamId = examId ?: user.activeExam?.id
            ?: return SubjectNeglectResponse(windowSize, emptyList())

        val recentMocks = mockTestRepository
            .findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, resolvedExamId)
            .take(windowSize)

        if (recentMocks.isEmpty()) return SubjectNeglectResponse(windowSize, emptyList())

        val allScores = subjectScoreRepository.findByUserIdAndExamId(user.id!!, resolvedExamId)
        val allSubjectNames = allScores.map { it.subjectName }.toSet()

        val subjectsByMockIndex: List<Set<String>> = recentMocks.map { mock ->
            mock.subjects.map { it.subjectName }.toSet()
        }

        val result = allSubjectNames.map { name ->
            val appearedInLastN      = subjectsByMockIndex.count { name in it }
            val lastAttemptedIndex   = subjectsByMockIndex.indexOfFirst { name in it }
            val normalizedIndex      = if (lastAttemptedIndex == -1) windowSize else lastAttemptedIndex

            val status = when {
                appearedInLastN == 0 -> NeglectStatus.NEGLECTED
                appearedInLastN < 2  -> NeglectStatus.PARTIALLY_NEGLECTED
                else                 -> NeglectStatus.ACTIVE
            }

            SubjectNeglectDTO(
                subjectName            = name,
                status                 = status,
                lastAttemptedMockIndex = normalizedIndex,
                appearedInLastN        = appearedInLastN
            )
        }
        .sortedWith(compareByDescending<SubjectNeglectDTO> { it.status.ordinal }
            .thenByDescending { it.lastAttemptedMockIndex })

        return SubjectNeglectResponse(windowSize, result)
    }

    @Transactional(readOnly = true)
    fun getAttemptAccuracyInsight(userEmail: String, examId: UUID?): AttemptAccuracyInsightDTO {
        val user = userRepository.findByEmail(userEmail)
            ?: return insufficientData()

        val resolvedExamId = examId ?: user.activeExam?.id
            ?: return insufficientData()

        val mocks = mockTestRepository
            .findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, resolvedExamId)
            .take(10)

        if (mocks.size < 4) return insufficientData()

        data class MockMetrics(val attemptRate: Double, val accuracy: Double)

        val metrics = mocks.map { mock ->
            val attemptRate = if (mock.totalQuestions > 0)
                mock.attempted.toDouble() / mock.totalQuestions else 0.0
            val accuracy = safeAccuracy(mock.correct, mock.attempted) / 100.0
            MockMetrics(attemptRate, accuracy)
        }

        val sorted   = metrics.sortedBy { it.attemptRate }
        val mid      = sorted.size / 2
        val lowGroup  = sorted.take(mid)
        val highGroup = sorted.drop(mid)

        val lowAccuracy  = round2(lowGroup.map { it.accuracy }.average() * 100)
        val highAccuracy = round2(highGroup.map { it.accuracy }.average() * 100)
        val lowRate      = round2(lowGroup.map { it.attemptRate }.average() * 100)
        val highRate     = round2(highGroup.map { it.attemptRate }.average() * 100)

        val diff  = highAccuracy - lowAccuracy
        val trend = when {
            diff < -3.0 -> AttemptAccuracyTrend.NEGATIVE
            diff > 3.0  -> AttemptAccuracyTrend.POSITIVE
            else        -> AttemptAccuracyTrend.NEUTRAL
        }

        val insight = when (trend) {
            AttemptAccuracyTrend.NEGATIVE ->
                "Accuracy drops ${round2(abs(diff))}% when you attempt more. " +
                "Try attempting fewer questions with higher confidence."
            AttemptAccuracyTrend.POSITIVE ->
                "Accuracy improves ${round2(diff)}% when you attempt more. " +
                "Attempting more questions is working in your favour."
            AttemptAccuracyTrend.NEUTRAL  ->
                "No significant link between attempt rate and accuracy. " +
                "Your accuracy stays consistent regardless of how much you attempt."
        }

        return AttemptAccuracyInsightDTO(
            trend               = trend,
            highAttemptAccuracy = highAccuracy,
            lowAttemptAccuracy  = lowAccuracy,
            highAttemptAvgRate  = highRate,
            lowAttemptAvgRate   = lowRate,
            insight             = insight
        )
    }

    private fun safeAccuracy(correct: Int, attempted: Int): Double =
        if (attempted > 0) (correct.toDouble() / attempted) * 100.0 else 0.0

    private fun round2(value: Double): Double =
        (value * 100.0).roundToInt() / 100.0

    private fun insufficientData() = AttemptAccuracyInsightDTO(
        trend               = AttemptAccuracyTrend.NEUTRAL,
        highAttemptAccuracy = 0.0,
        lowAttemptAccuracy  = 0.0,
        highAttemptAvgRate  = 0.0,
        lowAttemptAvgRate   = 0.0,
        insight             = "Add at least 4 mocks to see this insight."
    )
}
