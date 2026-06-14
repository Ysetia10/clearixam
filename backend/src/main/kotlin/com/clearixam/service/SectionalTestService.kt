package com.clearixam.service

import com.clearixam.dto.request.CreateSectionalTestRequest
import com.clearixam.dto.response.*
import com.clearixam.entity.SectionalTest
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SectionalTestRepository
import com.clearixam.repository.SubjectRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.round

@Service
class SectionalTestService(
    private val sectionalTestRepository: SectionalTestRepository,
    private val userRepository: UserRepository,
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository
) {

    @Transactional
    fun create(userEmail: String, request: CreateSectionalTestRequest): SectionalTestResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val exam = examRepository.findById(request.examId)
            .orElseThrow { IllegalArgumentException("Exam not found") }

        val subject = subjectRepository.findById(request.subjectId)
            .orElseThrow { IllegalArgumentException("Subject not found") }

        // Validate subject belongs to exam
        if (subject.exam.id != exam.id) {
            throw IllegalArgumentException("Subject does not belong to the selected exam")
        }

        if (request.correct > request.attempted) {
            throw IllegalArgumentException("Correct cannot exceed attempted")
        }

        if (request.attempted > request.totalQuestions) {
            throw IllegalArgumentException("Attempted cannot exceed total questions")
        }

        val incorrect = request.attempted - request.correct
        val score = round2(request.correct * exam.correctMarks - incorrect * exam.negativeMarks)
        val accuracy = if (request.attempted > 0) {
            round2((request.correct.toDouble() / request.attempted) * 100)
        } else 0.0
        val secondsPerQuestion = if (request.attempted > 0) {
            round2((request.timeTakenMinutes * 60.0) / request.attempted)
        } else null

        val entity = SectionalTest(
            user = user,
            exam = exam,
            subject = subject,
            testDate = request.testDate,
            totalQuestions = request.totalQuestions,
            attempted = request.attempted,
            correct = request.correct,
            incorrect = incorrect,
            timeTakenMinutes = request.timeTakenMinutes,
            score = score,
            accuracy = accuracy,
            secondsPerQuestion = secondsPerQuestion
        )

        val saved = sectionalTestRepository.save(entity)
        return toResponse(saved, exam.correctMarks, exam.negativeMarks)
    }

    @Transactional(readOnly = true)
    fun getAnalytics(userEmail: String, examId: UUID): SectionalAnalyticsResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val exam = examRepository.findById(examId)
            .orElseThrow { IllegalArgumentException("Exam not found") }

        val allTests = sectionalTestRepository.findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, examId)

        // Group by subject
        val bySubject = allTests.groupBy { it.subject.id!! }

        val subjects = bySubject.map { (subjectId, tests) ->
            val orderedAsc = tests.sortedWith(compareBy({ it.testDate }, { it.createdAt }))
            val subject = tests.first().subject

            val latestEntry = tests.first() // already desc order
            val bestScore = tests.maxOf { it.score }
            val avgAccuracy = round2(tests.map { it.accuracy }.average())

            // Score trend: avg of last 3 minus avg of previous 3
            val scoreTrend = calculateTrend(orderedAsc.map { it.score })
            val speedTrend = calculateTrend(orderedAsc.mapNotNull { it.secondsPerQuestion })

            val history = orderedAsc.map { t ->
                SectionalHistoryPoint(
                    id = t.id!!,
                    testDate = t.testDate,
                    score = t.score,
                    accuracy = t.accuracy,
                    secondsPerQuestion = t.secondsPerQuestion,
                    attempted = t.attempted,
                    correct = t.correct,
                    incorrect = t.incorrect,
                    unattempted = t.totalQuestions - t.attempted,
                    totalQuestions = t.totalQuestions,
                    timeTakenMinutes = t.timeTakenMinutes
                )
            }

            SectionalSubjectSummary(
                subjectId = subjectId,
                subjectName = subject.name,
                totalEntries = tests.size,
                latestScore = latestEntry.score,
                latestAccuracy = latestEntry.accuracy,
                latestSecondsPerQuestion = latestEntry.secondsPerQuestion,
                bestScore = bestScore,
                avgAccuracy = avgAccuracy,
                scoreTrend = round2(scoreTrend),
                speedTrend = if (speedTrend != 0.0) round2(speedTrend) else null,
                history = history
            )
        }.sortedByDescending { it.totalEntries }

        return SectionalAnalyticsResponse(
            examId = exam.id!!,
            examName = exam.name,
            subjects = subjects
        )
    }

    @Transactional(readOnly = true)
    fun listByExam(userEmail: String, examId: UUID): List<SectionalTestResponse> {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val exam = examRepository.findById(examId)
            .orElseThrow { IllegalArgumentException("Exam not found") }

        return sectionalTestRepository
            .findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, examId)
            .map { toResponse(it, exam.correctMarks, exam.negativeMarks) }
    }

    @Transactional
    fun delete(userEmail: String, id: UUID) {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val test = sectionalTestRepository.findByIdAndUserId(id, user.id!!)
            ?: throw NoSuchElementException("Sectional test not found")

        sectionalTestRepository.delete(test)
    }

    private fun toResponse(t: SectionalTest, correctMarks: Double, negativeMarks: Double) =
        SectionalTestResponse(
            id = t.id!!,
            examId = t.exam.id!!,
            examName = t.exam.name,
            subjectId = t.subject.id!!,
            subjectName = t.subject.name,
            testDate = t.testDate,
            totalQuestions = t.totalQuestions,
            attempted = t.attempted,
            correct = t.correct,
            incorrect = t.incorrect,
            unattempted = t.totalQuestions - t.attempted,
            timeTakenMinutes = t.timeTakenMinutes,
            score = t.score,
            accuracy = t.accuracy,
            secondsPerQuestion = t.secondsPerQuestion,
            correctMarks = correctMarks,
            negativeMarks = negativeMarks
        )

    /** Returns (avg of last half) - (avg of first half), or 0 if < 2 entries */
    private fun calculateTrend(values: List<Double>): Double {
        if (values.size < 2) return 0.0
        val mid = values.size / 2
        val firstHalf = values.take(mid)
        val secondHalf = values.drop(mid)
        return secondHalf.average() - firstHalf.average()
    }

    private fun round2(value: Double): Double = (value * 100.0).toLong() / 100.0
}
