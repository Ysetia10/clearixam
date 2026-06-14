package com.clearixam.repository

import com.clearixam.entity.SectionalTest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SectionalTestRepository : JpaRepository<SectionalTest, UUID> {

    fun findByUserIdOrderByTestDateDesc(userId: UUID): List<SectionalTest>

    fun findByUserIdAndExamIdOrderByTestDateDesc(userId: UUID, examId: UUID): List<SectionalTest>

    @Query("""
        SELECT st FROM SectionalTest st
        WHERE st.user.id = :userId
        AND st.exam.id = :examId
        AND st.subject.id = :subjectId
        ORDER BY st.testDate ASC, st.createdAt ASC
    """)
    fun findByUserIdAndExamIdAndSubjectIdOrderByTestDateAsc(
        userId: UUID,
        examId: UUID,
        subjectId: UUID
    ): List<SectionalTest>

    fun findByIdAndUserId(id: UUID, userId: UUID): SectionalTest?
}
