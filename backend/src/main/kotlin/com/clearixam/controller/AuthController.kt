package com.clearixam.controller

import com.clearixam.dto.request.LoginRequest
import com.clearixam.dto.request.RegisterRequest
import com.clearixam.dto.response.AuthResponse
import com.clearixam.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<AuthResponse> {
        val response = authService.register(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<AuthResponse> {
        val response = authService.login(request)
        return ResponseEntity.ok(response)
    }
}

@RestController
@RequestMapping("/api/test")
class TestController {

    @GetMapping("/protected")
    fun protectedEndpoint(): ResponseEntity<String> {
        return ResponseEntity.ok("This is a protected endpoint. You are authenticated!")
    }
}
