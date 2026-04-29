package com.clearixam.analytics

import com.clearixam.dto.response.AnalyticsOverviewResponse
import com.clearixam.dto.response.AnalyticsTrendResponse
import com.clearixam.dto.response.TrendPoint
import com.clearixam.dto.response.WeakSubjectResponse
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.SubjectScoreRepository
import com.clearixam.repository.UserRepository
import com.clearixam.service.GoalService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AnalyticsService(
    private val mockTestRepository: MockTestRepository,
    private val subjectScoreRepository: SubjectScoreRepository,
    private val userRepository: UserRepository,
    private val performanceCalculator: PerformanceCalculator,
    private val goalService: GoalService
) {

    @Transactional(readOnly = true)
    fun getOverview(userEmail: String, examId: UUID? = null): AnalyticsOverviewResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val resolvedExamId = examId ?: user.activeExam?.id

        val mocks = if (resolvedExamId != null) {
            mockTestRepository.findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, resolvedExamId)
        } else {
            mockTestRepository.findByUserIdOrderByTestDateDesc(user.id!!)
        }

        if (mocks.isEmpty()) {
            return AnalyticsOverviewResponse(
                averageScore = 0.0,
                movingAverage = 0.0,
                improvementRate = 0.0,
                probability = 0,
                riskLevel = PerformanceCalculator.RiskLevel.HIGH,
                weakSubjects = emptyList(),
                recommendedAttemptRange = "N/A",
                strategyNote = "No data available yet",
                consistencyScore = PerformanceCalculator.ConsistencyLevel.INSUFFICIENT_DATA,
                goalProgress = goalService.calculateGoalProgress(userEmail),
                lastFiveAverage = 0.0,
                previousFiveAverage = 0.0,
                performanceChange = 0.0
            )
        }

        val averageScore = performanceCalculator.calculateOverallAverage(mocks)
        val movingAverage = performanceCalculator.calculateMovingAverage(mocks)
        val improvementRate = performanceCalculator.calculateImprovementRate(mocks)
        val latestCutoff = mocks.first().cutoffScore
        val riskLevel = performanceCalculator.calculateRiskLevel(movingAverage, latestCutoff)
        val probability = performanceCalculator.calculateProbability(movingAverage, latestCutoff)
        val consistencyScore = performanceCalculator.calculateConsistencyScore(mocks)

        val sortedMocks = mocks.sortedByDescending { it.testDate }
        val lastFive = sortedMocks.take(5)
        val previousFive = sortedMocks.drop(5).take(5)
        val lastFiveAverage = if (lastFive.isNotEmpty()) lastFive.map { it.totalScore }.average() else 0.0
        val previousFiveAverage = if (previousFive.isNotEmpty()) previousFive.map { it.totalScore }.average() else lastFiveAverage
        val performanceChange = lastFiveAverage - previousFiveAverage

        // Compute weak subjects (accuracy < 80%) from subject_scores
        val weakSubjects = if (resolvedExamId != null) {
            val scores = subjectScoreRepository.findByUserIdAndExamId(user.id!!, resolvedExamId)
            scores.groupBy { it.subjectName }
                .map { (name, entries) ->
                    val totalAttempted = entries.sumOf { it.attempted }
                    val totalCorrect = entries.sumOf { it.correct }
                    val accuracy = if (totalAttempted > 0) (totalCorrect.toDouble() / totalAttempted) * 100 else 0.0
                    WeakSubjectResponse(subjectName = name, accuracy = accuracy)
                }
                .filter { it.accuracy < 80.0 }
                .sortedBy { it.accuracy }
                .take(5)
        } else emptyList()

        return AnalyticsOverviewResponse(
            averageScore = averageScore,
            movingAverage = movingAverage,
            improvementRate = improvementRate,
            probability = probability,
            riskLevel = riskLevel,
            weakSubjects = weakSubjects,
            recommendedAttemptRange = "N/A",
            strategyNote = if (weakSubjects.isNotEmpty()) "Focus on: ${weakSubjects.first().subjectName}" else "Keep it up!",
            consistencyScore = consistencyScore,
            goalProgress = goalService.calculateGoalProgress(userEmail),
            lastFiveAverage = lastFiveAverage,
            previousFiveAverage = previousFiveAverage,
            performanceChange = performanceChange
        )
    }

    @Transactional(readOnly = true)
    fun getTrend(userEmail: String, examId: UUID? = null): AnalyticsTrendResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val resolvedExamId = examId ?: user.activeExam?.id

        val mocks = if (resolvedExamId != null) {
            mockTestRepository.findByUserIdAndExamIdOrderByTestDateAsc(user.id!!, resolvedExamId)
        } else {
            mockTestRepository.findByUserIdOrderByTestDateAsc(user.id!!)
        }

        if (mocks.isEmpty()) return AnalyticsTrendResponse(emptyList())

        val trendPoints = mocks.mapIndexed { index, mock ->
            val mocksUpToNow = mocks.subList(0, index + 1)
            val movingAvg = performanceCalculator.calculateMovingAverage(mocksUpToNow, 3)
            TrendPoint(date = mock.testDate, score = mock.totalScore, movingAverage = movingAvg)
        }

        return AnalyticsTrendResponse(trendPoints)
    }

    @Transactional(readOnly = true)
    fun getSubjectAnalytics(userEmail: String): com.clearixam.dto.response.SubjectAnalyticsResponse {
        return com.clearixam.dto.response.SubjectAnalyticsResponse(emptyList())
    }
}
