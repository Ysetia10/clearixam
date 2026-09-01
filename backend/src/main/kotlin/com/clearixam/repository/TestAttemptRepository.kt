package com.clearixam.repository

import com.clearixam.entity.QuestionPaper
import com.clearixam.entity.TestAttempt
import com.clearixam.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface TestAttemptRepository : JpaRepository<TestAttempt, UUID> {
    fun findByIdAndUser(id: UUID, user: User): TestAttempt?
    fun findByUserOrderByStartedAtDesc(user: User): List<TestAttempt>
    fun findByUserAndPaperAndStatusOrderBySubmittedAtDesc(
        user: User,
        paper: QuestionPaper,
        status: String
    ): List<TestAttempt>
    fun findByUserAndPaperOrderByStartedAtDesc(user: User, paper: QuestionPaper): List<TestAttempt>

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        DELETE FROM TestAttempt t
        WHERE t.user = :user AND t.paper = :paper AND t.status = 'IN_PROGRESS'
        """
    )
    fun deleteInProgressForPaper(@Param("user") user: User, @Param("paper") paper: QuestionPaper): Int

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        DELETE FROM TestAttempt t
        WHERE t.user = :user AND t.paper = :paper AND t.status = 'IN_PROGRESS' AND t.id <> :keepId
        """
    )
    fun deleteOtherInProgress(
        @Param("user") user: User,
        @Param("paper") paper: QuestionPaper,
        @Param("keepId") keepId: UUID
    ): Int

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        DELETE FROM TestAttempt t
        WHERE t.user = :user AND t.paper = :paper AND t.id <> :keepId
        """
    )
    fun deleteAllExcept(
        @Param("user") user: User,
        @Param("paper") paper: QuestionPaper,
        @Param("keepId") keepId: UUID
    ): Int
}
