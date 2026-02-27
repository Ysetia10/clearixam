package com.clearixam.service

import com.clearixam.dto.request.CreateMockRequest
import com.clearixam.dto.request.SubjectInput
import com.clearixam.dto.response.MockDetailResponse
import com.clearixam.dto.response.MockResponse
import com.clearixam.dto.response.SubjectDetail
import com.clearixam.entity.MockTest
import com.clearixam.entity.SubjectScore
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class MockTestService(
    private val mockTestRepository: MockTestRepository,
    private val userRepository: UserRepository
) {

    @Transactional
    fun createMock(userEmail: String, request: CreateMockRequest): MockResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        validateSubjectInputs(request.subjects)

        val subjectScores = mutableListOf<SubjectScore>()
        var totalScore = 0.0

        val mockTest = MockTest(
            user = user,
            testDate = request.testDate,
            totalScore = 0.0,
            cutoffScore = request.cutoffScore
        )

        val savedMockTest = mockTestRepository.save(mockTest)

        request.subjects.forEach { subjectInput ->
            val score = calculateScore(subjectInput)
            totalScore += score

            val subjectScore = SubjectScore(
                mockTest = savedMockTest,
                subjectName = subjectInput.subjectName,
                attempted = subjectInput.attempted,
                correct = subjectInput.correct,
                incorrect = subjectInput.incorrect,
                score = score
            )
            subjectScores.add(subjectScore)
        }

        savedMockTest.subjects.addAll(subjectScores)
        val updatedMockTest = mockTestRepository.save(
            savedMockTest.copy(totalScore = totalScore)
        )

        return toMockResponse(updatedMockTest)
    }

    fun getMocksForUser(userEmail: String): List<MockResponse> {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        return mockTestRepository.findByUserIdOrderByTestDateDesc(user.id!!)
            .map { toMockResponse(it) }
    }

    fun getMockDetail(mockId: UUID, userEmail: String): MockDetailResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")

        val mockTest = mockTestRepository.findByIdAndUserId(mockId, user.id!!)
            ?: throw IllegalArgumentException("Mock test not found or access denied")

        return toMockDetailResponse(mockTest)
    }

    private fun calculateScore(input: SubjectInput): Double {
        return (input.correct * 2.0) - (input.incorrect * 0.66)
    }

    private fun validateSubjectInputs(subjects: List<SubjectInput>) {
        subjects.forEach { subject ->
            if (subject.attempted < subject.correct + subject.incorrect) {
                throw IllegalArgumentException(
                    "Invalid data for ${subject.subjectName}: attempted must be >= correct + incorrect"
                )
            }
        }
    }

    private fun toMockResponse(mockTest: MockTest): MockResponse {
        return MockResponse(
            id = mockTest.id!!,
            testDate = mockTest.testDate,
            totalScore = mockTest.totalScore,
            cutoffScore = mockTest.cutoffScore,
            probabilityScore = mockTest.probabilityScore
        )
    }

    private fun toMockDetailResponse(mockTest: MockTest): MockDetailResponse {
        return MockDetailResponse(
            id = mockTest.id!!,
            testDate = mockTest.testDate,
            totalScore = mockTest.totalScore,
            cutoffScore = mockTest.cutoffScore,
            probabilityScore = mockTest.probabilityScore,
            subjects = mockTest.subjects.map { subject ->
                SubjectDetail(
                    subjectName = subject.subjectName,
                    attempted = subject.attempted,
                    correct = subject.correct,
                    incorrect = subject.incorrect,
                    score = subject.score
                )
            }
        )
    }
}
