package com.clearixam.analytics

import com.clearixam.dto.response.AnalyticsOverviewResponse
import com.clearixam.dto.response.AnalyticsTrendResponse
import com.clearixam.dto.response.TrendPoint
import com.clearixam.dto.response.WeakSubjectResponse
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AnalyticsService(
    private val mockTestRepository: MockTestRepository,
    private val userRepository: UserRepository,
    private val performanceCalculator: PerformanceCalculator
) {

    @Transactional(readOnly = true)
    fun getOverview(userEmail: String): AnalyticsOverviewResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val mocks = mockTestRepository.findByUserIdOrderByTestDateDesc(user.id!!)

        if (mocks.isEmpty()) {
            return AnalyticsOverviewResponse(
                averageScore = 0.0,
                movingAverage = 0.0,
                improvementRate = 0.0,
                probability = 0,
                riskLevel = PerformanceCalculator.RiskLevel.HIGH,
                weakSubjects = emptyList()
            )
        }

        val averageScore = performanceCalculator.calculateOverallAverage(mocks)
        val movingAverage = performanceCalculator.calculateMovingAverage(mocks)
        val improvementRate = performanceCalculator.calculateImprovementRate(mocks)
        val weakSubjects = performanceCalculator.detectWeakSubjects(mocks)

        val latestCutoff = mocks.first().cutoffScore
        val riskLevel = performanceCalculator.calculateRiskLevel(movingAverage, latestCutoff)
        val probability = performanceCalculator.calculateProbability(movingAverage, latestCutoff)

        return AnalyticsOverviewResponse(
            averageScore = averageScore,
            movingAverage = movingAverage,
            improvementRate = improvementRate,
            probability = probability,
            riskLevel = riskLevel,
            weakSubjects = weakSubjects.map {
                WeakSubjectResponse(it.subjectName, it.accuracy)
            }
        )
    }

    @Transactional(readOnly = true)
    fun getTrend(userEmail: String): AnalyticsTrendResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val mocks = mockTestRepository.findByUserIdOrderByTestDateAsc(user.id!!)

        if (mocks.isEmpty()) {
            return AnalyticsTrendResponse(emptyList())
        }

        val trendPoints = mocks.mapIndexed { index, mock ->
            val mocksUpToNow = mocks.subList(0, index + 1)
            val movingAvg = performanceCalculator.calculateMovingAverage(mocksUpToNow, 3)
            
            TrendPoint(
                date = mock.testDate,
                score = mock.totalScore,
                movingAverage = movingAvg
            )
        }

        return AnalyticsTrendResponse(trendPoints)
    }
}
