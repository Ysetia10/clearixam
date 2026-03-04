package com.clearixam.repository

import com.clearixam.entity.Exam
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ExamRepository : JpaRepository<Exam, UUID> {
    fun findByName(name: String): Exam?
    fun existsByName(name: String): Boolean
}
