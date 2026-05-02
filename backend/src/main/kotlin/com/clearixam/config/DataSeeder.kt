package com.clearixam.config

import com.clearixam.entity.Exam
import com.clearixam.entity.Subject
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SubjectRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class DataSeeder(
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository
) : CommandLineRunner {

    @Transactional
    override fun run(vararg args: String?) {
        seedExams()
        seedSubjects()
    }

    data class ExamConfig(
        val name: String,
        val description: String,
        val maxMarks: Int,
        val maxQuestions: Int,
        val correctMarks: Double,
        val negativeMarks: Double
    )

    private fun seedExams() {
        val exams = listOf(
            ExamConfig("UPSC", "Union Public Service Commission", 200, 100, 2.0, 0.66),
            ExamConfig("SSC", "Staff Selection Commission", 200, 100, 2.0, 0.5),
            ExamConfig("CAT", "Common Admission Test", 300, 66, 3.0, 1.0)
        )

        exams.forEach { config ->
            val existing = examRepository.findByName(config.name)
            if (existing == null) {
                examRepository.save(
                    Exam(
                        name = config.name,
                        description = config.description,
                        maxMarks = config.maxMarks,
                        maxQuestions = config.maxQuestions,
                        correctMarks = config.correctMarks,
                        negativeMarks = config.negativeMarks
                    )
                )
            } else if (existing.correctMarks != config.correctMarks || existing.negativeMarks != config.negativeMarks) {
                examRepository.save(existing.copy(correctMarks = config.correctMarks, negativeMarks = config.negativeMarks))
            }
        }
    }

    private fun seedSubjects() {
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
