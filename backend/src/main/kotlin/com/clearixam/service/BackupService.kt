package com.clearixam.service

import com.clearixam.dto.request.ImportBackupRequest
import com.clearixam.dto.response.*
import com.clearixam.entity.Goal
import com.clearixam.entity.MockTest
import com.clearixam.entity.SubjectName
import com.clearixam.entity.SubjectScore
import com.clearixam.repository.GoalRepository
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.SubjectScoreRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class BackupService(
    private val mockTestRepository: MockTestRepository,
    private val subjectScoreRepository: SubjectScoreRepository,
    private val goalRepository: GoalRepository,
    private val userRepository: UserRepository
) {
    
    fun exportUserData(userEmail: String): BackupDataResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")
        val mocks = mockTestRepository.findByUserOrderByTestDateDesc(user)
        val goals = goalRepository.findByUser(user)
        
        val mockBackups = mocks.map { mock ->
            val subjects = subjectScoreRepository.findByMockTest(mock)
            MockBackupData(
                id = mock.id!!,
                testDate = mock.testDate,
                cutoffScore = mock.cutoffScore,
                totalScore = mock.totalScore,
                subjects = subjects.map { subject ->
                    SubjectBackupData(
                        subjectName = subject.subjectName.name,
                        attempted = subject.attempted,
                        correct = subject.correct,
                        incorrect = subject.incorrect,
                        score = subject.score
                    )
                }
            )
        }
        
        val goalBackups = goals.map { goal ->
            GoalBackupData(
                id = goal.id!!,
                targetScore = goal.targetScore,
                targetDate = goal.targetDate,
                createdAt = goal.createdAt
            )
        }
        
        return BackupDataResponse(
            exportDate = LocalDate.now(),
            user = UserBackupData(email = user.email),
            mocks = mockBackups,
            goals = goalBackups
        )
    }
    
    @Transactional
    fun importUserData(userEmail: String, request: ImportBackupRequest) {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found")
        // If overwrite is true, delete existing data
        if (request.overwriteExisting) {
            val existingMocks = mockTestRepository.findByUserOrderByTestDateDesc(user)
            existingMocks.forEach { mock ->
                subjectScoreRepository.deleteByMockTest(mock)
            }
            mockTestRepository.deleteAll(existingMocks)
            
            val existingGoals = goalRepository.findByUser(user)
            goalRepository.deleteAll(existingGoals)
        }
        
        // Import mocks
        request.mocks.forEach { mockData ->
            // Check for duplicates by test date
            val existing = mockTestRepository.findByUserAndTestDate(user, mockData.testDate)
            if (existing == null || request.overwriteExisting) {
                // Delete existing if overwrite
                if (existing != null) {
                    subjectScoreRepository.deleteByMockTest(existing)
                    mockTestRepository.delete(existing)
                }
                
                // Calculate total score
                val totalScore = mockData.subjects.sumOf { subject ->
                    val incorrect = subject.attempted - subject.correct
                    subject.correct * 2.0 - incorrect * 0.66
                }
                
                // Create new mock
                val mockTest = MockTest(
                    user = user,
                    testDate = mockData.testDate,
                    cutoffScore = mockData.cutoffScore,
                    totalScore = totalScore
                )
                val savedMock = mockTestRepository.save(mockTest)
                
                // Create subject scores
                mockData.subjects.forEach { subjectData ->
                    val incorrect = subjectData.attempted - subjectData.correct
                    val score = subjectData.correct * 2.0 - incorrect * 0.66
                    
                    val subjectScore = SubjectScore(
                        mockTest = savedMock,
                        subjectName = SubjectName.valueOf(subjectData.subjectName),
                        attempted = subjectData.attempted,
                        correct = subjectData.correct,
                        incorrect = incorrect,
                        score = score
                    )
                    subjectScoreRepository.save(subjectScore)
                }
            }
        }
        
        // Import goals
        request.goals.forEach { goalData ->
            // Check for duplicates by target date
            val existing = goalRepository.findByUserAndTargetDate(user, goalData.targetDate)
            if (existing == null || request.overwriteExisting) {
                // Delete existing if overwrite
                if (existing != null) {
                    goalRepository.delete(existing)
                }
                
                // Create new goal
                val goal = Goal(
                    user = user,
                    targetScore = goalData.targetScore,
                    targetDate = goalData.targetDate,
                    createdAt = java.time.LocalDateTime.now()
                )
                goalRepository.save(goal)
            }
        }
    }
}
