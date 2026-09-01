package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "test_attempts")
data class TestAttempt(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paper_id", nullable = false)
    val paper: QuestionPaper,

    @Column(nullable = false)
    val startedAt: LocalDateTime = LocalDateTime.now(),

    @Column
    val submittedAt: LocalDateTime? = null,

    /** Map of qNo -> answer string, JSON object. */
    @Column(columnDefinition = "TEXT")
    val answersJson: String? = null,

    /** Section breakdown JSON after submit. */
    @Column(columnDefinition = "TEXT")
    val sectionScoresJson: String? = null,

    @Column
    val totalScore: Double? = null,

    @Column
    val correctCount: Int? = null,

    @Column
    val incorrectCount: Int? = null,

    @Column
    val unattemptedCount: Int? = null,

    @Column(nullable = false, length = 24)
    val status: String = "IN_PROGRESS"
)
