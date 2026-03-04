package com.clearixam.repository

import com.clearixam.entity.SubjectPerformance
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SubjectPerformanceRepository : JpaRepository<SubjectPerformance, UUID> {
    fun findByUserIdAndExamId(userId: UUID, examId: UUID): List<SubjectPerformance>
    fun findByUserIdAndExamIdAndSubjectId(userId: UUID, examId: UUID, subjectId: UUID): List<SubjectPerformance>
    
    @Query("SELECT sp FROM SubjectPerformance sp WHERE sp.user.id = :userId AND sp.exam.id = :examId ORDER BY sp.testDate DESC")
    fun findByUserIdAndExamIdOrderByTestDateDesc(userId: UUID, examId: UUID): List<SubjectPerformance>
}
