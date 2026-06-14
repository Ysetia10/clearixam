package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "sectional_tests")
data class SectionalTest(
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
    val testDate: LocalDate,

    @Column(nullable = false)
    val totalQuestions: Int,

    @Column(nullable = false)
    val attempted: Int,

    @Column(nullable = false)
    val correct: Int,

    @Column(nullable = false)
    val incorrect: Int,

    /** Time taken in minutes */
    @Column(nullable = false)
    val timeTakenMinutes: Int,

    /** Computed: correct * correctMarks - incorrect * negativeMarks */
    @Column(nullable = false)
    val score: Double,

    /** Computed: (correct / attempted) * 100, or 0 if nothing attempted */
    @Column(nullable = false)
    val accuracy: Double,

    /** Computed: timeTakenMinutes * 60 / attempted seconds per question, null if attempted == 0 */
    @Column
    val secondsPerQuestion: Double? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
