package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "goals")
data class Goal(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(nullable = false)
    val targetScore: Double,

    @Column(nullable = false)
    val targetDate: LocalDate,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
