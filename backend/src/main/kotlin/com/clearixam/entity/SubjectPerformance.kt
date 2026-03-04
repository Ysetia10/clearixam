package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "subject_performance")
data class SubjectPerformance(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    val exam: Exam,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    val subject: Subject,

    @Column(nullable = false)
    val marks: Double,

    @Column(nullable = false)
    val questionsAttempted: Int,

    @Column(nullable = false)
    val correct: Int,

    @Column(nullable = false)
    val incorrect: Int,

    @Column(nullable = false)
    val testDate: LocalDate,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
