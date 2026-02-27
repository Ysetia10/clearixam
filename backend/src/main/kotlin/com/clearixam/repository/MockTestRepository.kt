package com.clearixam.repository

import com.clearixam.entity.MockTest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface MockTestRepository : JpaRepository<MockTest, UUID> {
    fun findByUserIdOrderByTestDateDesc(userId: UUID): List<MockTest>
    fun findByIdAndUserId(id: UUID, userId: UUID): MockTest?
}
