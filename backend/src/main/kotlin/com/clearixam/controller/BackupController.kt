package com.clearixam.controller

import com.clearixam.dto.request.ImportBackupRequest
import com.clearixam.dto.response.BackupDataResponse
import com.clearixam.service.BackupService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/backup")
class BackupController(
    private val backupService: BackupService
) {
    
    @GetMapping("/export")
    fun exportData(authentication: Authentication): ResponseEntity<BackupDataResponse> {
        val userEmail = authentication.name
        val backup = backupService.exportUserData(userEmail)
        return ResponseEntity.ok(backup)
    }
    
    @PostMapping("/import")
    fun importData(
        authentication: Authentication,
        @Valid @RequestBody request: ImportBackupRequest
    ): ResponseEntity<Map<String, String>> {
        val userEmail = authentication.name
        backupService.importUserData(userEmail, request)
        return ResponseEntity.ok(mapOf("message" to "Data imported successfully"))
    }
}
