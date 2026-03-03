package com.clearixam.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.CorsFilter

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter
) {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    fun corsFilter(): CorsFilter {
        val source = UrlBasedCorsConfigurationSource()
        val config = CorsConfiguration()
        
        // Allow specific origins
        config.allowedOrigins = listOf(
            "http://localhost:3000",
            "http://localhost:5173",
            "https://clearixam.vercel.app"
        )
        
        // Allow all HTTP methods
        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
        
        // Allow all headers
        config.allowedHeaders = listOf("*")
        
        // Expose headers
        config.exposedHeaders = listOf("Authorization", "Content-Type")
        
        // Allow credentials
        config.allowCredentials = true
        
        // Cache preflight for 1 hour
        config.maxAge = 3600L
        
        source.registerCorsConfiguration("/**", config)
        return CorsFilter(source)
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            // Disable CORS in Spring Security (handled by CorsFilter above)
            .cors { it.disable() }
            
            // Disable CSRF for stateless JWT API
            .csrf { it.disable() }
            
            // Stateless session management
            .sessionManagement { 
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) 
            }
            
            // Configure authorization rules
            .authorizeHttpRequests { auth ->
                auth
                    // Allow all OPTIONS requests (CORS preflight)
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    
                    // Public endpoints - no authentication required
                    .requestMatchers(
                        "/api/auth/**",
                        "/auth/**",
                        "/register",
                        "/login",
                        "/health",
                        "/actuator/health",
                        "/swagger-ui/**",
                        "/v3/api-docs/**"
                    ).permitAll()
                    
                    // All other endpoints require authentication
                    .anyRequest().authenticated()
            }
            
            // Add JWT filter before Spring Security's authentication filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return BCryptPasswordEncoder()
    }
}
