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

    // Marks per correct answer
    @Column(nullable = false, columnDefinition = "float8 default 2.0")
    val correctMarks: Double = 2.0,

    // Marks deducted per incorrect answer (positive value, e.g. 0.5 means -0.5)
    @Column(nullable = false, columnDefinition = "float8 default 0.66")
    val negativeMarks: Double = 0.66,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
