package com.clearixam.repository

import java.util.UUID

/** Lightweight paper row for list endpoints (excludes contentJson). */
data class PaperListRow(
    val id: UUID,
    val slug: String,
    val title: String,
    val examId: UUID,
    val examName: String,
    val year: Int,
    val slot: String,
    val durationMinutes: Int,
    val questionCount: Int
)
