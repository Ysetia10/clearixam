package com.clearixam.service

import com.clearixam.dto.request.CreateSubjectRequest
import com.clearixam.dto.response.SubjectResponse
import com.clearixam.entity.Subject
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SubjectRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class SubjectService(
    private val subjectRepository: SubjectRepository,
    private val examRepository: ExamRepository
) {
    private val logger = LoggerFactory.getLogger(SubjectService::class.java)

    fun getSubjectsByExam(examId: UUID): List<SubjectResponse> {
        logger.info("Fetching subjects for exam: $examId")
        return subjectRepository.findByExamId(examId).map { subject ->
            SubjectResponse(
                id = subject.id!!,
                name = subject.name,
                examId = subject.exam.id!!,
                examName = subject.exam.name
            )
        }
    }

    @Transactional
    fun createSubject(request: CreateSubjectRequest): SubjectResponse {
        logger.info("Creating subject: ${request.name} for exam: ${request.examId}")
        
        val exam = examRepository.findById(request.examId)
            .orElseThrow { IllegalArgumentException("Exam not found with id: ${request.examId}") }
        
        if (subjectRepository.existsByNameAndExam(request.name, exam)) {
            throw IllegalArgumentException("Subject '${request.name}' already exists for exam '${exam.name}'")
        }
        
        val subject = Subject(
            name = request.name,
            exam = exam
        )
        
        val saved = subjectRepository.save(subject)
        logger.info("Subject created successfully: ${saved.id}")
        
        return SubjectResponse(
            id = saved.id!!,
            name = saved.name,
            examId = saved.exam.id!!,
            examName = saved.exam.name
        )
    }

    @Transactional
    fun deleteSubject(id: UUID) {
        logger.info("Deleting subject: $id")
        
        if (!subjectRepository.existsById(id)) {
            throw IllegalArgumentException("Subject not found with id: $id")
        }
        
        subjectRepository.deleteById(id)
        logger.info("Subject deleted successfully: $id")
    }
}
