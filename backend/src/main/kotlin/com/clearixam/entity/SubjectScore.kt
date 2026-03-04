package com.clearixam.entity

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "subject_scores")
data class SubjectScore(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mock_test_id", nullable = false)
    val mockTest: MockTest,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    val subject: Subject,

    @Column(nullable = false)
    val attempted: Int,

    @Column(nullable = false)
    val correct: Int,

    @Column(nullable = false)
    val incorrect: Int,

    @Column(nullable = false)
    val score: Double
)
