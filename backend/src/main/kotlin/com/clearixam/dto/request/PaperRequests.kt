package com.clearixam.dto.request

import jakarta.validation.constraints.NotNull

data class SubmitAttemptRequest(
    @field:NotNull
    val answers: Map<String, String> = emptyMap()
)
