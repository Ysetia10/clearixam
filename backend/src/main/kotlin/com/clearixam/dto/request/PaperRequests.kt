package com.clearixam.dto.request

import jakarta.validation.constraints.NotNull

data class SubmitAttemptRequest(
    @field:NotNull
    val answers: Map<String, String> = emptyMap(),
    /** Seconds spent on each question (qNo → seconds). Optional for older clients. */
    val secondsSpent: Map<String, Int> = emptyMap()
)
