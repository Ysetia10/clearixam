package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "mock_tests")
data class MockTest(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(nullable = false)
    val testDate: LocalDate,

    @Column(nullable = false)
    val totalScore: Double,

    @Column(nullable = false)
    val cutoffScore: Double,

    @Column
    val probabilityScore: Double? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @OneToMany(mappedBy = "mockTest", cascade = [CascadeType.ALL], orphanRemoval = true)
    val subjects: MutableList<SubjectScore> = mutableListOf()
)
