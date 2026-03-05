package com.clearixam.service

import com.clearixam.dto.response.ExamResponse
import com.clearixam.entity.Exam
import com.clearixam.entity.Subject
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SubjectRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class ExamService(
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository
) {
    private val logger = LoggerFactory.getLogger(ExamService::class.java)

    fun getAllExams(): List<ExamResponse> {
        return try {
            logger.info("ExamService.getAllExams() - Starting")
            val exams = examRepository.findAll()
            logger.info("ExamService.getAllExams() - Found ${exams.size} exams in database")
            
            // Auto-seed if no exams exist
            if (exams.isEmpty()) {
                logger.info("ExamService.getAllExams() - No exams found, attempting auto-seed")
                try {
                    seedDefaultExams()
                    logger.info("ExamService.getAllExams() - Auto-seed completed, fetching exams again")
                    return examRepository.findAll().map { exam ->
                        ExamResponse(
                            id = exam.id!!,
                            name = exam.name,
                            description = exam.description,
                            maxMarks = exam.maxMarks,
                            maxQuestions = exam.maxQuestions
                        )
                    }
                } catch (seedError: Exception) {
                    logger.error("ExamService.getAllExams() - Auto-seed failed", seedError)
                    throw seedError
                }
            }
            
            logger.info("ExamService.getAllExams() - Returning ${exams.size} exams")
            exams.map { exam ->
                ExamResponse(
                    id = exam.id!!,
                    name = exam.name,
                    description = exam.description,
                    maxMarks = exam.maxMarks,
                    maxQuestions = exam.maxQuestions
                )
            }
        } catch (e: Exception) {
            logger.error("ExamService.getAllExams() - Unexpected error", e)
            throw e
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

    @Transactional
    fun seedDefaultExams() {
        logger.info("Seeding default exams and subjects")
        
        val exams = listOf(
            Triple("UPSC", "Union Public Service Commission", Pair(200, 100)),
            Triple("SSC", "Staff Selection Commission", Pair(200, 200)),
            Triple("CAT", "Common Admission Test", Pair(300, 66))
        )

        exams.forEach { (name, description, limits) ->
            if (!examRepository.existsByName(name)) {
                val exam = Exam(
                    name = name,
                    description = description,
                    maxMarks = limits.first,
                    maxQuestions = limits.second
                )
                examRepository.save(exam)
                logger.info("Seeded exam: $name")
            }
        }

        val subjectsByExam = mapOf(
            "UPSC" to listOf(
                "Polity", "History", "Geography", "Economy", 
                "Environment", "Science", "Current Affairs", "CSAT"
            ),
            "SSC" to listOf(
                "Quantitative Aptitude", "Reasoning", "English", "General Awareness"
            ),
            "CAT" to listOf(
                "Quantitative Ability", "Verbal Ability and Reading Comprehension", "Data Interpretation and Logical Reasoning"
            )
        )

        subjectsByExam.forEach { (examName, subjects) ->
            val exam = examRepository.findByName(examName)
            if (exam != null) {
                subjects.forEach { subjectName ->
                    if (!subjectRepository.existsByNameAndExam(subjectName, exam)) {
                        val subject = Subject(
                            name = subjectName,
                            exam = exam
                        )
                        subjectRepository.save(subject)
                        logger.info("Seeded subject: $subjectName for exam: $examName")
                    }
                }
            }
        }
        
        logger.info("Seeding completed successfully")
    }
}
