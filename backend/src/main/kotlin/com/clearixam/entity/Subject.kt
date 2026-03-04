package com.clearixam.entity

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(
    name = "subjects",
    uniqueConstraints = [UniqueConstraint(columnNames = ["name", "exam_id"])]
)
data class Subject(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    val exam: Exam,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
