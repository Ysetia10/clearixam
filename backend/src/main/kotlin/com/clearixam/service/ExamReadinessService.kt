package com.clearixam.service

import com.clearixam.dto.response.ExamReadinessResponse
import com.clearixam.dto.response.ReadinessStatus
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.GoalRepository
import org.springframework.stereotype.Service
import java.util.UUID
import kotlin.math.sqrt

@Service
class ExamReadinessService(
    private val mockTestRepository: MockTestRepository,
    private val goalRepository: GoalRepository
) {

    fun calculateReadinessScore(userId: UUID): ExamReadinessResponse {
        val recentMocks = mockTestRepository.findTop5ByUserIdOrderByTestDateDesc(userId)

        if (recentMocks.isEmpty()) {
            return ExamReadinessResponse(
                score = 0,
                status = ReadinessStatus.NEEDS_IMPROVEMENT,
                averageScore = 0.0,
                consistency = 0.0,
                totalMocks = 0,
                message = "No mock tests found. Start taking mocks to track your readiness."
            )
        }

        val averageScore = recentMocks.map { it.totalScore }.average()
        val variance = calculateVariance(recentMocks.map { it.totalScore.toDouble() })
        val standardDeviation = sqrt(variance)

        val consistencyScore = if (averageScore > 0) {
            maxOf(0.0, 100.0 - (standardDeviation / averageScore * 100))
        } else {
            0.0
        }

        val goal = goalRepository.findByUserId(userId).firstOrNull()
        val targetScore = goal?.targetScore?.toDouble() ?: 450.0
        val targetAchievement = (averageScore / targetScore) * 100.0

        val readinessScore = (
            (averageScore / 5.0) * 0.5 +
            consistencyScore * 0.3 +
            minOf(targetAchievement, 100.0) * 0.2
        ).toInt().coerceIn(0, 100)

        val status = when {
            readinessScore <= 40 -> ReadinessStatus.NEEDS_IMPROVEMENT
            readinessScore <= 70 -> ReadinessStatus.ON_TRACK
            else -> ReadinessStatus.EXAM_READY
        }

        val message = when (status) {
            ReadinessStatus.NEEDS_IMPROVEMENT ->
                "Focus on improving your scores and consistency. Take more mocks regularly."
            ReadinessStatus.ON_TRACK ->
                "You're making good progress! Keep practicing to reach exam-ready status."
            ReadinessStatus.EXAM_READY ->
                "Excellent! You're well-prepared. Maintain this performance."
        }

        return ExamReadinessResponse(
            score = readinessScore,
            status = status,
            averageScore = averageScore,
            consistency = consistencyScore,
            totalMocks = recentMocks.size,
            message = message
        )
    }

    private fun calculateVariance(values: List<Double>): Double {
        if (values.isEmpty()) return 0.0
        val mean = values.average()
        return values.map { (it - mean) * (it - mean) }.average()
    }
}
