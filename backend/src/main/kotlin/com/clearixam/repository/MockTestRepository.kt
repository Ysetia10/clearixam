package com.clearixam.repository

import com.clearixam.entity.MockTest
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface MockTestRepository : JpaRepository<MockTest, UUID> {
    fun findByUserIdOrderByTestDateDesc(userId: UUID): List<MockTest>
    fun findByUserIdOrderByTestDateAsc(userId: UUID): List<MockTest>
    fun findByUserIdOrderByTestDateDesc(userId: UUID, pageable: Pageable): Page<MockTest>
    fun findByIdAndUserId(id: UUID, userId: UUID): MockTest?
}
