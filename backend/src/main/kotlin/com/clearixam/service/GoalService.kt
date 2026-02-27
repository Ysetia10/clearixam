package com.clearixam.service

import com.clearixam.dto.request.CreateGoalRequest
import com.clearixam.dto.response.GoalProgressResponse
import com.clearixam.dto.response.GoalResponse
import com.clearixam.entity.Goal
import com.clearixam.repository.GoalRepository
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class GoalService(
    private val goalRepository: GoalRepository,
    private val userRepository: UserRepository,
    private val mockTestRepository: MockTestRepository
) {

    @Transactional
    fun createGoal(userEmail: String, request: CreateGoalRequest): GoalResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val goal = Goal(
            user = user,
            targetScore = request.targetScore,
            targetDate = request.targetDate
        )

        val savedGoal = goalRepository.save(goal)
        return toGoalResponse(savedGoal)
    }

    @Transactional(readOnly = true)
    fun getGoals(userEmail: String): List<GoalResponse> {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        return goalRepository.findByUserId(user.id!!)
            .map { toGoalResponse(it) }
    }

    @Transactional
    fun deleteGoal(goalId: UUID, userEmail: String) {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val goal = goalRepository.findByIdAndUserId(goalId, user.id!!)
            ?: throw IllegalArgumentException("Goal not found or access denied")

        goalRepository.delete(goal)
    }

    @Transactional(readOnly = true)
    fun calculateGoalProgress(userEmail: String): GoalProgressResponse? {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val goals = goalRepository.findByUserId(user.id!!)
        if (goals.isEmpty()) return null

        val activeGoal = goals.maxByOrNull { it.targetDate }
            ?: return null

        val mocks = mockTestRepository.findByUserIdOrderByTestDateDesc(user.id)
        if (mocks.isEmpty()) {
            return GoalProgressResponse(
                goalProgressPercent = 0.0,
                daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), activeGoal.targetDate),
                onTrack = false,
                currentScore = 0.0,
                targetScore = activeGoal.targetScore
            )
        }

        val recentMocks = mocks.take(3)
        val movingAverage = recentMocks.map { it.totalScore }.average()

        val progressPercent = (movingAverage / activeGoal.targetScore) * 100
        val daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), activeGoal.targetDate)

        val onTrack = if (mocks.size >= 2) {
            val sorted = mocks.sortedBy { it.testDate }
            val oldest = sorted.first().totalScore
            val latest = sorted.last().totalScore
            val improvementRate = if (oldest != 0.0) (latest - oldest) / oldest else 0.0
            
            val projectedScore = movingAverage * (1 + improvementRate * 0.5)
            projectedScore >= activeGoal.targetScore
        } else {
            movingAverage >= activeGoal.targetScore
        }

        return GoalProgressResponse(
            goalProgressPercent = progressPercent,
            daysRemaining = daysRemaining,
            onTrack = onTrack,
            currentScore = movingAverage,
            targetScore = activeGoal.targetScore
        )
    }

    private fun toGoalResponse(goal: Goal): GoalResponse {
        return GoalResponse(
            id = goal.id!!,
            targetScore = goal.targetScore,
            targetDate = goal.targetDate,
            createdAt = goal.createdAt.toString()
        )
    }
}
