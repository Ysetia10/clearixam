package com.clearixam.service

import com.clearixam.dto.response.ExamResponse
import com.clearixam.repository.ExamRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class ExamService(
    private val examRepository: ExamRepository
) {
    private val logger = LoggerFactory.getLogger(ExamService::class.java)

    fun getAllExams(): List<ExamResponse> {
        logger.info("Fetching all exams")
        return examRepository.findAll().map { exam ->
            ExamResponse(
                id = exam.id!!,
                name = exam.name,
                description = exam.description,
                maxMarks = exam.maxMarks,
                maxQuestions = exam.maxQuestions
            )
        }
    }

    fun getExamById(id: UUID): ExamResponse {
        logger.info("Fetching exam with id: $id")
        val exam = examRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Exam not found with id: $id") }
        
        return ExamResponse(
            id = exam.id!!,
            name = exam.name,
            description = exam.description,
            maxMarks = exam.maxMarks,
            maxQuestions = exam.maxQuestions
        )
    }
}
