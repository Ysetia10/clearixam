package com.clearixam.service

import com.clearixam.dto.request.CreateSubjectPerformanceRequest
import com.clearixam.dto.response.SubjectPerformanceResponse
import com.clearixam.entity.SubjectPerformance
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SubjectPerformanceRepository
import com.clearixam.repository.SubjectRepository
import com.clearixam.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class SubjectPerformanceService(
    private val subjectPerformanceRepository: SubjectPerformanceRepository,
    private val userRepository: UserRepository,
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository
) {
    private val logger = LoggerFactory.getLogger(SubjectPerformanceService::class.java)

    @Transactional
    fun createPerformance(userId: UUID, request: CreateSubjectPerformanceRequest): SubjectPerformanceResponse {
        logger.info("Creating subject performance for user: $userId")
        
        val user = userRepository.findById(userId)
            .orElseThrow { IllegalArgumentException("User not found") }
        
        val exam = examRepository.findById(request.examId)
            .orElseThrow { IllegalArgumentException("Exam not found") }
        
        val subject = subjectRepository.findById(request.subjectId)
            .orElseThrow { IllegalArgumentException("Subject not found") }
        
        // Validations
        if (request.questionsAttempted > exam.maxQuestions) {
            throw IllegalArgumentException("Questions attempted (${request.questionsAttempted}) cannot exceed exam max questions (${exam.maxQuestions})")
        }
        
        if (request.marks > exam.maxMarks) {
            throw IllegalArgumentException("Marks obtained (${request.marks}) cannot exceed exam max marks (${exam.maxMarks})")
        }
        
        if (request.correct + request.incorrect > request.questionsAttempted) {
            throw IllegalArgumentException("Correct + Incorrect cannot exceed questions attempted")
        }
        
        val performance = SubjectPerformance(
            user = user,
            exam = exam,
            subject = subject,
            marks = request.marks,
            questionsAttempted = request.questionsAttempted,
            correct = request.correct,
            incorrect = request.incorrect,
            testDate = request.testDate
        )
        
        val saved = subjectPerformanceRepository.save(performance)
        logger.info("Subject performance created: ${saved.id}")
        
        return toResponse(saved)
    }

    fun getPerformanceByExam(userId: UUID, examId: UUID): List<SubjectPerformanceResponse> {
        logger.info("Fetching performance for user: $userId, exam: $examId")
        return subjectPerformanceRepository.findByUserIdAndExamIdOrderByTestDateDesc(userId, examId)
            .map { toResponse(it) }
    }

    @Transactional
    fun deletePerformance(userId: UUID, performanceId: UUID) {
        logger.info("Deleting performance: $performanceId for user: $userId")
        
        val performance = subjectPerformanceRepository.findById(performanceId)
            .orElseThrow { IllegalArgumentException("Performance record not found") }
        
        if (performance.user.id != userId) {
            throw IllegalArgumentException("Unauthorized to delete this performance record")
        }
        
        subjectPerformanceRepository.deleteById(performanceId)
        logger.info("Performance deleted: $performanceId")
    }

    private fun toResponse(performance: SubjectPerformance): SubjectPerformanceResponse {
        val accuracy = if (performance.questionsAttempted > 0) {
            (performance.correct.toDouble() / performance.questionsAttempted.toDouble()) * 100
        } else {
            0.0
        }
        
        return SubjectPerformanceResponse(
            id = performance.id!!,
            userId = performance.user.id!!,
            examId = performance.exam.id!!,
            subjectId = performance.subject.id!!,
            subjectName = performance.subject.name,
            marks = performance.marks,
            questionsAttempted = performance.questionsAttempted,
            correct = performance.correct,
            incorrect = performance.incorrect,
            accuracy = String.format("%.2f", accuracy).toDouble(),
            testDate = performance.testDate.toString()
        )
    }
}
