package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "question_papers")
data class QuestionPaper(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    val exam: Exam,

    @Column(unique = true, nullable = false, length = 120)
    val slug: String,

    @Column(nullable = false)
    val title: String,

    @Column(nullable = false)
    val year: Int,

    @Column(nullable = false, length = 16)
    val slot: String,

    @Column(nullable = false)
    val durationMinutes: Int,

    @Column(nullable = false)
    val questionCount: Int,

    /** Full parsed paper JSON (includes answer key for server-side scoring). */
    @Column(nullable = false, columnDefinition = "TEXT")
    val contentJson: String,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
