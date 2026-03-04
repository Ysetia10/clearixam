package com.clearixam.service

import com.clearixam.dto.response.ExamReadinessResponse
import com.clearixam.dto.response.ReadinessStatus
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.GoalRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.UUID
import kotlin.math.sqrt

@Service
class ExamReadinessService(
    private val mockTestRepository: MockTestRepository,
    private val goalRepository: GoalRepository
) {
    
    private val logger = LoggerFactory.getLogger(ExamReadinessService::class.java)

    fun calculateReadinessScore(userId: UUID): ExamReadinessResponse {
        val startTime = System.currentTimeMillis()
        
        // Get last 5 mocks
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

        // Calculate average score
        val averageScore = recentMocks.map { it.totalScore }.average()
        
        // Calculate consistency (lower variance = higher consistency)
        val variance = calculateVariance(recentMocks.map { it.totalScore.toDouble() })
        val standardDeviation = sqrt(variance)
        
        // Consistency score: 100 - (std dev as percentage of mean)
        val consistencyScore = if (averageScore > 0) {
            maxOf(0.0, 100.0 - (standardDeviation / averageScore * 100))
        } else {
            0.0
        }
        
        // Get target score from goal (if exists)
        val goal = goalRepository.findByUserId(userId).firstOrNull()
        val targetScore = goal?.targetScore?.toDouble() ?: 450.0 // Default UPSC cutoff
        
        // Calculate target achievement percentage
        val targetAchievement = (averageScore / targetScore) * 100.0
        
        // Calculate final readiness score (weighted average)
        val readinessScore = (
            (averageScore / 5.0) * 0.5 +  // 50% weight on average score (normalized to 100)
            consistencyScore * 0.3 +        // 30% weight on consistency
            minOf(targetAchievement, 100.0) * 0.2  // 20% weight on target achievement
        ).toInt().coerceIn(0, 100)
        
        // Determine status
        val status = when {
            readinessScore <= 40 -> ReadinessStatus.NEEDS_IMPROVEMENT
            readinessScore <= 70 -> ReadinessStatus.ON_TRACK
            else -> ReadinessStatus.EXAM_READY
        }
        
        // Generate message
        val message = when (status) {
            ReadinessStatus.NEEDS_IMPROVEMENT -> 
                "Focus on improving your scores and consistency. Take more mocks regularly."
            ReadinessStatus.ON_TRACK -> 
                "You're making good progress! Keep practicing to reach exam-ready status."
            ReadinessStatus.EXAM_READY -> 
                "Excellent! You're well-prepared. Maintain this performance."
        }
        
        val duration = System.currentTimeMillis() - startTime
        logger.info("Calculated readiness score for user $userId in ${duration}ms: $readinessScore")
        
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
