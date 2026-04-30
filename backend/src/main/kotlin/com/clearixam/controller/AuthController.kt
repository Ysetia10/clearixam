package com.clearixam.controller

import com.clearixam.dto.request.LoginRequest
import com.clearixam.dto.request.RegisterRequest
import com.clearixam.dto.response.AuthResponse
import com.clearixam.security.RateLimitService
import com.clearixam.service.AuthService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
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
    
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: RegisterRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<AuthResponse> {
        val origin = httpRequest.getHeader("Origin")
        val method = httpRequest.method
        
        logger.info("=== REGISTER REQUEST ===")
        logger.info("Method: $method")
        logger.info("Origin: $origin")
        logger.info("Content-Type: ${httpRequest.getHeader("Content-Type")}")
        logger.info("Email: ${request.email}")
        
        try {
            val response = authService.register(request)
            logger.info("Registration successful for: ${request.email}")
            return ResponseEntity.ok(response)
        } catch (e: Exception) {
            logger.error("Registration failed for ${request.email}: ${e.message}", e)
            throw e
        }
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val origin = httpRequest.getHeader("Origin")
        val method = httpRequest.method
        val ipAddress = getClientIP(httpRequest)
        
        logger.info("=== LOGIN REQUEST ===")
        logger.info("Method: $method")
        logger.info("Origin: $origin")
        logger.info("Content-Type: ${httpRequest.getHeader("Content-Type")}")
        logger.info("IP Address: $ipAddress")
        logger.info("Email: ${request.email}")
        
        // Check rate limit
        if (rateLimitService.isRateLimited(ipAddress)) {
            logger.warn("Rate limit exceeded for IP: $ipAddress")
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(mapOf("error" to "Too many login attempts. Please try again later."))
        }
        
        try {
            val response = authService.login(request)
            // Clear attempts on successful login
            rateLimitService.clearAttempts(ipAddress)
            logger.info("Login successful for: ${request.email}")
            return ResponseEntity.ok(response)
        } catch (e: Exception) {
            // Record failed attempt
            rateLimitService.recordAttempt(ipAddress)
            logger.error("Login failed for ${request.email}: ${e.message}")
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
    
    /**
     * Admin endpoint to reset user password
     * Use this when you have database access but forgot password
     */
    @PostMapping("/admin/reset-password")
    fun resetPassword(
        @RequestBody request: Map<String, String>
    ): ResponseEntity<Map<String, Any>> {
        val email = request["email"] ?: throw IllegalArgumentException("Email is required")
        val newPassword = request["newPassword"] ?: throw IllegalArgumentException("New password is required")
        
        logger.info("Password reset requested for email: $email")
        
        try {
            val success = authService.resetPassword(email, newPassword)
            logger.info("Password reset successful for: $email")
            
            return ResponseEntity.ok(mapOf(
                "success" to success,
                "message" to "Password reset successfully for $email"
            ))
        } catch (e: Exception) {
            logger.error("Password reset failed for $email: ${e.message}")
            return ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to (e.message ?: "Unknown error")
            ))
        }
    }
    
    /**
     * Admin endpoint to list all users
     */
    @GetMapping("/admin/users")
    fun getAllUsers(): ResponseEntity<List<Map<String, Any>>> {
        try {
            val users = authService.getAllUsers()
            val userList = users.map { user ->
                mapOf(
                    "id" to user.id.toString(),
                    "email" to user.email,
                    "createdAt" to user.createdAt.toString(),
                    "activeExam" to (user.activeExam?.name ?: "None")
                )
            }
            
            return ResponseEntity.ok(userList)
        } catch (e: Exception) {
            logger.error("Failed to get users: ${e.message}")
            throw e
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
