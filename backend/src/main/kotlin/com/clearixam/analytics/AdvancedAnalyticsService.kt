package com.clearixam.analytics

import com.clearixam.dto.response.*
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.SubjectScoreRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.abs
import kotlin.math.roundToInt

@Service
class AdvancedAnalyticsService(
    private val mockTestRepository: MockTestRepository,
    private val subjectScoreRepository: SubjectScoreRepository,
    private val userRepository: UserRepository,
    private val subjectAnalyticsService: SubjectAnalyticsService
) {

    // ── Feature 4: Reliable Improvement Rate ─────────────────────────────────

    @Transactional(readOnly = true)
    fun getImprovement(userEmail: String, examId: UUID?): ImprovementDTO {
        val user = userRepository.findByEmail(userEmail)
            ?: return noImprovementData()

        val resolvedExamId = examId ?: user.activeExam?.id
            ?: return noImprovementData()

        val mocks = mockTestRepository
            .findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, resolvedExamId)

        if (mocks.size < 5) {
            return ImprovementDTO(
                improvementRate = 0.0,
                trend = ImprovementTrend.STABLE,
                last5Avg = if (mocks.isNotEmpty()) mocks.map { it.totalScore }.average() else 0.0,
                prev5Avg = 0.0
            )
        }

        val last5 = mocks.take(5)
        val prev5 = mocks.drop(5).take(5)

        val last5Avg = last5.map { it.totalScore }.average()
        val prev5Avg = if (prev5.isNotEmpty()) prev5.map { it.totalScore }.average() else last5Avg

        val improvementRate = last5Avg - prev5Avg
        val trend = when {
            improvementRate > 2.0 -> ImprovementTrend.IMPROVING
            improvementRate < -2.0 -> ImprovementTrend.DECLINING
            else -> ImprovementTrend.STABLE
        }

        return ImprovementDTO(
            improvementRate = round2(improvementRate),
            trend = trend,
            last5Avg = round2(last5Avg),
            prev5Avg = round2(prev5Avg)
        )
    }

    // ── Feature 5: Adaptive Subject Strength ─────────────────────────────────

    @Transactional(readOnly = true)
    fun getAdaptiveStrength(userEmail: String, examId: UUID?): AdaptiveStrengthResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: return AdaptiveStrengthResponse(0.0, emptyList())

        val resolvedExamId = examId ?: user.activeExam?.id
            ?: return AdaptiveStrengthResponse(0.0, emptyList())

        val allScores = subjectScoreRepository.findByUserIdAndExamId(user.id!!, resolvedExamId)
        if (allScores.isEmpty()) return AdaptiveStrengthResponse(0.0, emptyList())

        // Calculate overall accuracy across all subjects
        val totalAttempted = allScores.sumOf { it.attempted }
        val totalCorrect = allScores.sumOf { it.correct }
        val overallAccuracy = if (totalAttempted > 0) 
            (totalCorrect.toDouble() / totalAttempted) * 100 else 0.0

        // Group by subject and calculate relative performance
        val subjectResults = allScores
            .groupBy { it.subjectName }
            .map { (name, scores) ->
                val subjectAttempted = scores.sumOf { it.attempted }
                val subjectCorrect = scores.sumOf { it.correct }
                val subjectAccuracy = if (subjectAttempted > 0)
                    (subjectCorrect.toDouble() / subjectAttempted) * 100 else 0.0

                val relativeScore = subjectAccuracy - overallAccuracy

                val status = when {
                    relativeScore < -10.0 -> SubjectStrengthStatus.WEAK
                    relativeScore < -5.0 -> SubjectStrengthStatus.BELOW_AVERAGE
                    relativeScore > 5.0 -> SubjectStrengthStatus.STRONG
                    else -> SubjectStrengthStatus.AVERAGE
                }

                AdaptiveSubjectStrengthDTO(
                    subjectName = name,
                    accuracy = round2(subjectAccuracy),
                    relativeScore = round2(relativeScore),
                    status = status
                )
            }
            .sortedBy { it.relativeScore } // weakest first

        return AdaptiveStrengthResponse(
            overallAccuracy = round2(overallAccuracy),
            subjects = subjectResults
        )
    }

    // ── Feature 6: Rule-Based Insight Engine ─────────────────────────────────

    @Transactional(readOnly = true)
    fun getInsights(userEmail: String, examId: UUID?): InsightsResponse {
        val insights = mutableListOf<InsightDTO>()

        try {
            // Get data from existing services
            val neglectData = subjectAnalyticsService.getSubjectNeglect(userEmail, examId)
            val attemptInsight = subjectAnalyticsService.getAttemptAccuracyInsight(userEmail, examId)
            val improvement = getImprovement(userEmail, examId)
            val adaptiveStrength = getAdaptiveStrength(userEmail, examId)

            // Rule 1: Neglected subjects (highest priority)
            val neglectedSubjects = neglectData.subjects.filter { it.status == NeglectStatus.NEGLECTED }
            if (neglectedSubjects.isNotEmpty()) {
                val subject = neglectedSubjects.first().subjectName
                insights.add(InsightDTO(
                    type = InsightType.WARNING,
                    message = "You haven't attempted $subject in your last ${neglectData.windowSize} mocks. Consider including it in your next test."
                ))
            }

            // Rule 2: Weak subjects from adaptive analysis
            val weakSubjects = adaptiveStrength.subjects.filter { it.status == SubjectStrengthStatus.WEAK }
            if (weakSubjects.isNotEmpty() && insights.size < 5) {
                val subject = weakSubjects.first()
                insights.add(InsightDTO(
                    type = InsightType.WARNING,
                    message = "${subject.subjectName} is ${abs(subject.relativeScore).toInt()}% below your average. Focus on improving this area."
                ))
            }

            // Rule 3: Attempt strategy issues
            if (attemptInsight.trend == AttemptAccuracyTrend.NEGATIVE && insights.size < 5) {
                insights.add(InsightDTO(
                    type = InsightType.WARNING,
                    message = "Your accuracy drops when attempting more questions. Try a more selective approach."
                ))
            }

            // Rule 4: Performance declining
            if (improvement.trend == ImprovementTrend.DECLINING && insights.size < 5) {
                insights.add(InsightDTO(
                    type = InsightType.WARNING,
                    message = "Your recent performance has declined by ${abs(improvement.improvementRate).toInt()} points. Review your weak areas."
                ))
            }

            // Rule 5: Performance improving (positive reinforcement)
            if (improvement.trend == ImprovementTrend.IMPROVING && insights.size < 5) {
                insights.add(InsightDTO(
                    type = InsightType.SUCCESS,
                    message = "Great progress! You've improved by ${improvement.improvementRate.toInt()} points in recent mocks."
                ))
            }

            // Rule 6: Strong subjects (encouragement)
            val strongSubjects = adaptiveStrength.subjects.filter { it.status == SubjectStrengthStatus.STRONG }
            if (strongSubjects.isNotEmpty() && insights.size < 5) {
                val subject = strongSubjects.first()
                insights.add(InsightDTO(
                    type = InsightType.SUCCESS,
                    message = "${subject.subjectName} is a strength (+${subject.relativeScore.toInt()}% above average). Keep it up!"
                ))
            }

            // Rule 7: Attempt strategy positive
            if (attemptInsight.trend == AttemptAccuracyTrend.POSITIVE && insights.size < 5) {
                insights.add(InsightDTO(
                    type = InsightType.INFO,
                    message = "Attempting more questions works well for you. Your accuracy improves with higher attempt rates."
                ))
            }

            // Fallback if no insights
            if (insights.isEmpty()) {
                insights.add(InsightDTO(
                    type = InsightType.INFO,
                    message = "Keep taking mocks regularly to unlock personalized insights about your performance."
                ))
            }

        } catch (e: Exception) {
            // Graceful fallback
            insights.add(InsightDTO(
                type = InsightType.INFO,
                message = "Add more mock test data to see detailed performance insights."
            ))
        }

        return InsightsResponse(insights.take(5))
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun round2(value: Double): Double =
        (value * 100.0).roundToInt() / 100.0

    private fun noImprovementData() = ImprovementDTO(
        improvementRate = 0.0,
        trend = ImprovementTrend.STABLE,
        last5Avg = 0.0,
        prev5Avg = 0.0
    )
}