package com.clearixam.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

data class HealthResponse(val status: String)

@RestController
class HealthController {

    @GetMapping("/health", "/api/health")
    fun health(): HealthResponse = HealthResponse("UP")
}
