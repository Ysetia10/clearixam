package com.clearixam.controller

import com.clearixam.dto.request.LoginRequest
import com.clearixam.dto.request.RegisterRequest
import com.clearixam.dto.response.AuthResponse
import com.clearixam.security.RateLimitService
import com.clearixam.service.AuthService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    origins = [
        "http://localhost:3000",
        "http://localhost:5173", 
        "https://clearixam.vercel.app"
    ],
    allowedHeaders = ["*"],
    methods = [
        RequestMethod.GET,
        RequestMethod.POST,
        RequestMethod.PUT,
        RequestMethod.DELETE,
        RequestMethod.OPTIONS
    ],
    allowCredentials = "true"
)
class AuthController(
    private val authService: AuthService,
    private val rateLimitService: RateLimitService
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<AuthResponse> {
        val response = authService.register(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val ipAddress = getClientIP(httpRequest)
        
        // Check rate limit
        if (rateLimitService.isRateLimited(ipAddress)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(mapOf("error" to "Too many login attempts. Please try again later."))
        }
        
        try {
            val response = authService.login(request)
            // Clear attempts on successful login
            rateLimitService.clearAttempts(ipAddress)
            return ResponseEntity.ok(response)
        } catch (e: Exception) {
            // Record failed attempt
            rateLimitService.recordAttempt(ipAddress)
            throw e
        }
    }
    
    private fun getClientIP(request: HttpServletRequest): String {
        val xForwardedFor = request.getHeader("X-Forwarded-For")
        return if (xForwardedFor != null && xForwardedFor.isNotEmpty()) {
            xForwardedFor.split(",")[0].trim()
        } else {
            request.remoteAddr
        }
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
