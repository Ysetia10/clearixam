package com.clearixam.repository

import com.clearixam.entity.Goal
import com.clearixam.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.UUID

@Repository
interface GoalRepository : JpaRepository<Goal, UUID> {
    fun findByUserId(userId: UUID): List<Goal>
    fun findByIdAndUserId(id: UUID, userId: UUID): Goal?
    fun findByUser(user: User): List<Goal>
    fun findByUserAndTargetDate(user: User, targetDate: LocalDate): Goal?
}
