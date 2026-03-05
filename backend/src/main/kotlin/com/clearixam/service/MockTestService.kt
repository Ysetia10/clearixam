package com.clearixam.service

import com.clearixam.dto.request.CreateMockRequest
import com.clearixam.dto.response.MockDetailResponse
import com.clearixam.dto.response.MockResponse
import com.clearixam.dto.response.PagedMockResponse
import com.clearixam.dto.response.SubjectDetail
import com.clearixam.entity.MockTest
import com.clearixam.entity.SubjectScore
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.SubjectRepository
import com.clearixam.repository.SubjectScoreRepository
import com.clearixam.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class MockTestService(
    private val mockTestRepository: MockTestRepository,
    private val userRepository: UserRepository,
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository,
    private val subjectScoreRepository: SubjectScoreRepository
) {

    private val logger = LoggerFactory.getLogger(MockTestService::class.java)

    @Transactional
    fun createMock(userEmail: String, request: CreateMockRequest): MockResponse {
        logger.info("Creating mock test for user: $userEmail, exam: ${request.examId}")

        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")

        val exam = examRepository.findById(request.examId)
            .orElseThrow { IllegalArgumentException("Exam not found: ${request.examId}") }

        // Calculate totals from subject inputs
        val totalAttempted = request.subjects.sumOf { it.attempted }
        val totalCorrect = request.subjects.sumOf { it.correct }
        val totalIncorrect = request.subjects.sumOf { it.attempted - it.correct }
        // Score formula: correct * 2 - incorrect * 0.66
        val marksObtained = totalCorrect * 2.0 - totalIncorrect * 0.66
        val totalScore = marksObtained
        val probabilityScore = calculateProbability(totalScore, request.cutoffScore)

        val mockTest = MockTest(
            user = user,
            exam = exam,
            testName = request.testName,
            testDate = request.testDate,
            totalQuestions = exam.maxQuestions,
            attempted = totalAttempted,
            correct = totalCorrect,
            incorrect = totalIncorrect,
            marksObtained = marksObtained,
            totalScore = totalScore,
            cutoffScore = request.cutoffScore,
            probabilityScore = probabilityScore
        )

        val savedMock = mockTestRepository.save(mockTest)

        // Save subject scores
        request.subjects.forEach { subjectInput ->
            val subject = subjectRepository.findById(subjectInput.subjectId)
                .orElseThrow { IllegalArgumentException("Subject not found: ${subjectInput.subjectId}") }

            val incorrect = subjectInput.attempted - subjectInput.correct
            val score = subjectInput.correct * 2.0 - incorrect * 0.66

            val subjectScore = SubjectScore(
                mockTest = savedMock,
                subject = subject,
                attempted = subjectInput.attempted,
                correct = subjectInput.correct,
                incorrect = incorrect,
                score = score
            )
            subjectScoreRepository.save(subjectScore)
        }

        logger.info("Created mock test ${savedMock.id} for user: $userEmail")

        return toMockResponse(savedMock)
    }

    @Transactional(readOnly = true)
    fun getMocksForUser(userEmail: String, page: Int, size: Int): PagedMockResponse {
        logger.info("Fetching mocks for user: $userEmail, page: $page, size: $size")

        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")

        val pageable = PageRequest.of(page, size)
        val pagedResult = mockTestRepository.findByUserIdOrderByTestDateDesc(user.id!!, pageable)

        val content = pagedResult.content.map { toMockResponse(it) }

        return PagedMockResponse(
            content = content,
            page = pagedResult.number,
            size = pagedResult.size,
            totalElements = pagedResult.totalElements,
            totalPages = pagedResult.totalPages
        )
    }

    @Transactional(readOnly = true)
    fun getMockDetail(mockId: UUID, userEmail: String): MockDetailResponse {
        logger.info("Fetching mock detail $mockId for user: $userEmail")

        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")

        val mockTest = mockTestRepository.findByIdAndUserId(mockId, user.id!!)
            ?: throw NoSuchElementException("Mock test not found: $mockId")

        val subjectScores = subjectScoreRepository.findByMockTest(mockTest)

        val subjectDetails = subjectScores.map { ss ->
            SubjectDetail(
                subjectId = ss.subject.id!!,
                subjectName = ss.subject.name,
                attempted = ss.attempted,
                correct = ss.correct,
                incorrect = ss.incorrect,
                score = ss.score
            )
        }

        return MockDetailResponse(
            id = mockTest.id!!,
            testName = mockTest.testName,
            examId = mockTest.exam.id!!,
            examName = mockTest.exam.name,
            testDate = mockTest.testDate,
            totalScore = mockTest.totalScore,
            cutoffScore = mockTest.cutoffScore,
            probabilityScore = mockTest.probabilityScore,
            attempted = mockTest.attempted,
            correct = mockTest.correct,
            incorrect = mockTest.incorrect,
            totalQuestions = mockTest.totalQuestions,
            marksObtained = mockTest.marksObtained,
            subjects = subjectDetails
        )
    }

    @Transactional
    fun deleteMock(mockId: UUID, userEmail: String) {
        logger.info("Deleting mock $mockId for user: $userEmail")

        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")

        val mockTest = mockTestRepository.findByIdAndUserId(mockId, user.id!!)
            ?: throw NoSuchElementException("Mock test not found: $mockId")

        subjectScoreRepository.deleteByMockTest(mockTest)
        mockTestRepository.delete(mockTest)

        logger.info("Deleted mock test $mockId")
    }

    // ---- Helpers ----

    private fun toMockResponse(mock: MockTest) = MockResponse(
        id = mock.id!!,
        testName = mock.testName,
        examId = mock.exam.id!!,
        examName = mock.exam.name,
        testDate = mock.testDate,
        totalScore = mock.totalScore,
        cutoffScore = mock.cutoffScore,
        probabilityScore = mock.probabilityScore,
        attempted = mock.attempted,
        correct = mock.correct,
        incorrect = mock.incorrect,
        totalQuestions = mock.totalQuestions,
        marksObtained = mock.marksObtained
    )

    private fun calculateProbability(score: Double, cutoff: Double): Double {
        if (cutoff <= 0) return 50.0
        val ratio = score / cutoff
        return when {
            ratio >= 1.2  -> 90.0
            ratio >= 1.1  -> 75.0
            ratio >= 1.0  -> 60.0
            ratio >= 0.9  -> 40.0
            ratio >= 0.8  -> 20.0
            else          -> 5.0
        }
    }
}
