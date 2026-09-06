package com.clearixam.repository

import com.clearixam.entity.QuestionPaper
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface QuestionPaperRepository : JpaRepository<QuestionPaper, UUID> {
    fun findBySlug(slug: String): QuestionPaper?
    fun findAllByOrderByYearDescTitleAsc(): List<QuestionPaper>
    fun findByExamIdOrderByYearDescTitleAsc(examId: UUID): List<QuestionPaper>

    @Query(
        """
        select new com.clearixam.repository.PaperListRow(
            p.id, p.slug, p.title, e.id, e.name, p.year, p.slot, p.durationMinutes, p.questionCount
        )
        from QuestionPaper p join p.exam e
        order by p.year desc, p.title asc
        """
    )
    fun findAllListRows(): List<PaperListRow>

    @Query(
        """
        select new com.clearixam.repository.PaperListRow(
            p.id, p.slug, p.title, e.id, e.name, p.year, p.slot, p.durationMinutes, p.questionCount
        )
        from QuestionPaper p join p.exam e
        where e.id = :examId
        order by p.year desc, p.title asc
        """
    )
    fun findListRowsByExamId(@Param("examId") examId: UUID): List<PaperListRow>
}
