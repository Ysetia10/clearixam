package com.clearixam.controller

import com.clearixam.dto.request.CreateGoalRequest
import com.clearixam.dto.response.GoalResponse
import com.clearixam.service.GoalService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/goals")
class GoalController(
    private val goalService: GoalService
) {

    @PostMapping
    fun createGoal(
        @Valid @RequestBody request: CreateGoalRequest,
        authentication: Authentication
    ): ResponseEntity<GoalResponse> {
        val userEmail = authentication.name
        val goal = goalService.createGoal(userEmail, request)
        return ResponseEntity.ok(goal)
    }

    @GetMapping
    fun getGoals(authentication: Authentication): ResponseEntity<List<GoalResponse>> {
        val userEmail = authentication.name
        val goals = goalService.getGoals(userEmail)
        return ResponseEntity.ok(goals)
    }

    @DeleteMapping("/{id}")
    fun deleteGoal(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<Void> {
        val userEmail = authentication.name
        goalService.deleteGoal(id, userEmail)
        return ResponseEntity.noContent().build()
    }
}
