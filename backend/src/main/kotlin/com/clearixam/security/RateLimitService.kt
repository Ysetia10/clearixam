package com.clearixam.security

import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Service
class RateLimitService {
    private val loginAttempts = ConcurrentHashMap<String, MutableList<Instant>>()
    private val maxAttemptsPerMinute = 5
    private val windowSeconds = 60L
    
    fun isRateLimited(ipAddress: String): Boolean {
        val now = Instant.now()
        val attempts = loginAttempts.getOrPut(ipAddress) { mutableListOf() }
        
        attempts.removeIf { it.isBefore(now.minusSeconds(windowSeconds)) }
        
        if (attempts.size >= maxAttemptsPerMinute) {
            return true
        }
        
        attempts.add(now)
        
        return false
    }
    
    fun recordAttempt(ipAddress: String) {
        val now = Instant.now()
        val attempts = loginAttempts.getOrPut(ipAddress) { mutableListOf() }
        attempts.add(now)
        
        attempts.removeIf { it.isBefore(now.minusSeconds(windowSeconds)) }
    }
    
    fun clearAttempts(ipAddress: String) {
        loginAttempts.remove(ipAddress)
    }
}
