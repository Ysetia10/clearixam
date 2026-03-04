package com.clearixam.service

import com.clearixam.dto.request.LoginRequest
import com.clearixam.dto.request.RegisterRequest
import com.clearixam.dto.response.AuthResponse
import com.clearixam.entity.User
import com.clearixam.repository.UserRepository
import com.clearixam.security.JwtUtil
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtUtil: JwtUtil
) {

    fun register(request: RegisterRequest): AuthResponse {
        if (userRepository.findByEmail(request.email) != null) {
            throw IllegalArgumentException("Email already exists")
        }

        val user = User(
            email = request.email,
            password = passwordEncoder.encode(request.password)
        )

        userRepository.save(user)

        val token = jwtUtil.generateToken(user.email)
        return AuthResponse(token)
    }

    fun login(request: LoginRequest): AuthResponse {
        val user = userRepository.findByEmail(request.email)
            ?: throw IllegalArgumentException("Invalid email or password")

        if (!passwordEncoder.matches(request.password, user.password)) {
            throw IllegalArgumentException("Invalid email or password")
        }

        val token = jwtUtil.generateToken(user.email)
        return AuthResponse(token)
    }

    fun getUserByEmail(email: String): User {
        return userRepository.findByEmail(email)
            ?: throw NoSuchElementException("User not found")
    }
}
