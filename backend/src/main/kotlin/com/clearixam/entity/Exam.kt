package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "exams")
data class Exam(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(unique = true, nullable = false)
    val name: String,

    @Column(nullable = false)
    val description: String,

    @Column(nullable = false)
    val maxMarks: Int,

    @Column(nullable = false)
    val maxQuestions: Int,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
