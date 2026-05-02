package com.clearixam.service

import com.clearixam.dto.request.SetActiveExamRequest
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val examRepository: ExamRepository
) {
    @Transactional
    fun setActiveExam(userId: UUID, request: SetActiveExamRequest) {
        val user = userRepository.findById(userId)
            .orElseThrow { IllegalArgumentException("User not found") }

        val exam = examRepository.findById(request.examId)
            .orElseThrow { IllegalArgumentException("Exam not found") }

        user.activeExam = exam
        userRepository.save(user)
    }
}
