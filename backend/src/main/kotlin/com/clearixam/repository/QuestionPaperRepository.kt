package com.clearixam.repository

import com.clearixam.entity.QuestionPaper
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface QuestionPaperRepository : JpaRepository<QuestionPaper, UUID> {
    fun findBySlug(slug: String): QuestionPaper?
    fun findAllByOrderByYearDescTitleAsc(): List<QuestionPaper>
    fun findByExamIdOrderByYearDescTitleAsc(examId: UUID): List<QuestionPaper>
}
