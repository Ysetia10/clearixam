package com.clearixam.controller

import com.clearixam.dto.request.SetActiveExamRequest
import com.clearixam.service.AuthService
import com.clearixam.service.UserService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService,
    private val authService: AuthService
) {

    @PutMapping("/active-exam")
    fun setActiveExam(
        @Valid @RequestBody request: SetActiveExamRequest,
        authentication: Authentication
    ): ResponseEntity<Map<String, String>> {
        val userEmail = authentication.name
        val user = authService.getUserByEmail(userEmail)
        
        userService.setActiveExam(user.id!!, request)
        return ResponseEntity.ok(mapOf("message" to "Active exam updated successfully"))
    }
}
