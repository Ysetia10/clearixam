package com.clearixam.repository

import com.clearixam.entity.MockTest
import com.clearixam.entity.SubjectScore
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SubjectScoreRepository : JpaRepository<SubjectScore, UUID> {
    fun findByMockTest(mockTest: MockTest): List<SubjectScore>
    fun deleteByMockTest(mockTest: MockTest)
}
