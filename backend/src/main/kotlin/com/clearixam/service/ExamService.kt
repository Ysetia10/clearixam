package com.clearixam.service

import com.clearixam.dto.response.ExamResponse
import com.clearixam.entity.Exam
import com.clearixam.entity.Subject
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SubjectRepository
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class ExamService(
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository,
    private val mockTestRepository: MockTestRepository,
    private val userRepository: UserRepository
) {
    fun getAllExams(): List<ExamResponse> {
        return examRepository.findAll().map { exam ->
            ExamResponse(
                id = exam.id!!,
                name = exam.name,
                description = exam.description,
                maxMarks = exam.maxMarks,
                maxQuestions = exam.maxQuestions,
                correctMarks = exam.correctMarks,
                negativeMarks = exam.negativeMarks
            )
        }
    }

    fun getAllExamsOrderedByMockCount(userEmail: String): List<ExamResponse> {
        return try {
            val user = userRepository.findByEmail(userEmail) ?: return getAllExams()

            val exams = examRepository.findAll()
            val examMockCounts = exams.map { exam ->
                val mockCount = mockTestRepository.findByUserIdAndExamIdOrderByTestDateDesc(user.id!!, exam.id!!).size
                exam to mockCount
            }

            examMockCounts
                .sortedWith(compareByDescending<Pair<Exam, Int>> { it.second }.thenBy { it.first.name })
                .map { it.first }
                .map { exam ->
                    ExamResponse(
                        id = exam.id!!,
                        name = exam.name,
                        description = exam.description,
                        maxMarks = exam.maxMarks,
                        maxQuestions = exam.maxQuestions,
                        correctMarks = exam.correctMarks,
                        negativeMarks = exam.negativeMarks
                    )
                }
        } catch (_: Exception) {
            getAllExams()
        }
    }

    fun getExamById(id: UUID): ExamResponse {
        val exam = examRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Exam not found with id: $id") }

        return ExamResponse(
            id = exam.id!!,
            name = exam.name,
            description = exam.description,
            maxMarks = exam.maxMarks,
            maxQuestions = exam.maxQuestions,
            correctMarks = exam.correctMarks,
            negativeMarks = exam.negativeMarks
        )
    }

    @Transactional
    fun seedDefaultExams() {
        val exams = listOf(
            Triple("UPSC", "Union Public Service Commission", Pair(200, 100)),
            Triple("SSC", "Staff Selection Commission", Pair(200, 100)),
            Triple("CAT", "Common Admission Test", Pair(300, 66))
        )

        exams.forEach { (name, description, limits) ->
            if (!examRepository.existsByName(name)) {
                examRepository.save(Exam(name = name, description = description, maxMarks = limits.first, maxQuestions = limits.second))
            }
        }

        val subjectsByExam = mapOf(
            "UPSC" to listOf("Polity", "History", "Geography", "Economy", "Environment", "Science", "Current Affairs", "CSAT"),
            "SSC" to listOf("Quantitative Aptitude", "Reasoning", "English", "General Awareness"),
            "CAT" to listOf("Quantitative Ability", "Verbal Ability and Reading Comprehension", "Data Interpretation and Logical Reasoning")
        )

        subjectsByExam.forEach { (examName, subjects) ->
            val exam = examRepository.findByName(examName)
            if (exam != null) {
                subjects.forEach { subjectName ->
                    if (!subjectRepository.existsByNameAndExam(subjectName, exam)) {
                        subjectRepository.save(Subject(name = subjectName, exam = exam))
                    }
                }
            }
        }
    }
}
