package com.clearixam.repository

import com.clearixam.entity.Exam
import com.clearixam.entity.Subject
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SubjectRepository : JpaRepository<Subject, UUID> {
    fun findByExam(exam: Exam): List<Subject>
    fun findByExamId(examId: UUID): List<Subject>
    fun findByNameAndExam(name: String, exam: Exam): Subject?
    fun existsByNameAndExam(name: String, exam: Exam): Boolean
}
