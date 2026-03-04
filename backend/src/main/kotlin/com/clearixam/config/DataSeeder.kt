package com.clearixam.config

import com.clearixam.entity.Exam
import com.clearixam.entity.Subject
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.SubjectRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class DataSeeder(
    private val examRepository: ExamRepository,
    private val subjectRepository: SubjectRepository
) : CommandLineRunner {

    private val logger = LoggerFactory.getLogger(DataSeeder::class.java)

    @Transactional
    override fun run(vararg args: String?) {
        seedExams()
        seedSubjects()
    }

    private fun seedExams() {
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
    }

    private fun seedSubjects() {
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
    }
}
