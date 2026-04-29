package com.clearixam.repository

import com.clearixam.entity.MockTest
import com.clearixam.entity.SubjectScore
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SubjectScoreRepository : JpaRepository<SubjectScore, UUID> {
    fun findByMockTest(mockTest: MockTest): List<SubjectScore>
    fun deleteByMockTest(mockTest: MockTest)

    @Query("""
        SELECT ss FROM SubjectScore ss
        JOIN ss.mockTest mt
        WHERE mt.user.id = :userId
        AND mt.exam.id = :examId
        ORDER BY mt.testDate DESC
    """)
    fun findByUserIdAndExamId(userId: UUID, examId: UUID): List<SubjectScore>
}
