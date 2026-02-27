package com.clearixam.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtUtil: JwtUtil
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            val token = authHeader.substring(7)
            
            try {
                if (jwtUtil.validateToken(token)) {
                    val email = jwtUtil.extractEmail(token)
                    
                    val authentication = UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        emptyList()
                    )
                    authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                    
                    SecurityContextHolder.getContext().authentication = authentication
                }
            } catch (e: Exception) {
                logger.error("JWT validation failed: ${e.message}")
            }
        }

        filterChain.doFilter(request, response)
    }
}
