package com.clearixam.security

import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
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

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter
) {
    
    private val logger = LoggerFactory.getLogger(SecurityConfig::class.java)

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        
        // Allow specific origins
        configuration.allowedOrigins = listOf(
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            "https://clearixam.vercel.app"
        )
        
        // Allow all HTTP methods
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
        
        // Allow all headers
        configuration.allowedHeaders = listOf("*")
        
        // Expose headers
        configuration.exposedHeaders = listOf("Authorization", "Content-Type")
        
        // Allow credentials
        configuration.allowCredentials = true
        
        // Cache preflight for 1 hour
        configuration.maxAge = 3600L
        
        logger.info("CORS Configuration initialized with origins: ${configuration.allowedOrigins}")
        
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        logger.info("Configuring Security Filter Chain")
        
        http
            // Enable CORS with our configuration
            .cors { it.configurationSource(corsConfigurationSource()) }
            
            // Disable CSRF for stateless JWT API
            .csrf { it.disable() }
            
            // Add security headers
            .headers { headers ->
                headers
                    .contentSecurityPolicy { csp ->
                        csp.policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;")
                    }
                    .frameOptions { it.deny() }
                    .xssProtection { }
                    .contentTypeOptions { }
                    .referrerPolicy { referrer ->
                        referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                    }
                    .httpStrictTransportSecurity { hsts ->
                        hsts.maxAgeInSeconds(31536000)
                            .includeSubDomains(true)
                    }
            }
            
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
                
                logger.info("Authorization rules configured - public endpoints: /api/auth/**, /auth/**, /health")
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
