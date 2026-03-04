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
        val requestPath = request.requestURI
        val requestMethod = request.method
        
        logger.info("JWT Filter - Method: $requestMethod, Path: $requestPath, Origin: ${request.getHeader("Origin")}")
        
        val authHeader = request.getHeader("Authorization")

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            val token = authHeader.substring(7)
            
            try {
                if (jwtUtil.validateToken(token)) {
                    val email = jwtUtil.extractEmail(token)
                    
                    logger.info("JWT validated successfully for user: $email")
                    
                    val authentication = UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        emptyList()
                    )
                    authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                    
                    SecurityContextHolder.getContext().authentication = authentication
                } else {
                    logger.warn("JWT token validation failed")
                }
            } catch (e: Exception) {
                logger.error("JWT validation failed: ${e.message}")
            }
        } else {
            logger.debug("No JWT token found in request to $requestPath")
        }

        filterChain.doFilter(request, response)
    }
}
