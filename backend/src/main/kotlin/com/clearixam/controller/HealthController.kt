package com.clearixam.controller

import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController(
    private val jdbcTemplate: JdbcTemplate
) {

    private val logger = LoggerFactory.getLogger(HealthController::class.java)

    @GetMapping("/health")
    fun health(): ResponseEntity<Map<String, String>> {
        return try {
            val examCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM exams", Int::class.java
            ) ?: 0
            ResponseEntity.ok(mapOf(
                "status" to "UP",
                "db" to "OK",
                "exams" to examCount.toString()
            ))
        } catch (e: Exception) {
            logger.error("Health check DB error", e)
            ResponseEntity.status(500).body(mapOf(
                "status" to "UP",
                "db" to "ERROR: ${e.message?.take(120)}",
                "hint" to "Run prod_migration.sql on your Render database"
            ))
        }
    }
}

