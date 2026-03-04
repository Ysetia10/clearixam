package com.clearixam.service

import com.clearixam.dto.request.SetActiveExamRequest
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val examRepository: ExamRepository
) {
    private val logger = LoggerFactory.getLogger(UserService::class.java)

    @Transactional
    fun setActiveExam(userId: UUID, request: SetActiveExamRequest) {
        logger.info("User {} switching to exam {}", userId, request.examId)
        
        val user = userRepository.findById(userId)
            .orElseThrow { IllegalArgumentException("User not found") }
        
        val exam = examRepository.findById(request.examId)
            .orElseThrow { IllegalArgumentException("Exam not found") }
        
        user.activeExam = exam
        userRepository.save(user)
        
        logger.info("User {} successfully switched to exam {}", userId, exam.name)
    }
}
