package com.clearixam.controller

import com.clearixam.service.ReportService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/reports")
class ReportController(
    private val reportService: ReportService
) {
    
    @GetMapping("/performance", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generatePerformanceReport(authentication: Authentication): ResponseEntity<ByteArray> {
        val userEmail = authentication.name
        val pdfBytes = reportService.generatePerformanceReport(userEmail)
        
        val filename = "Clearixam_Report_${LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))}.pdf"
        
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_PDF
        headers.setContentDispositionFormData("attachment", filename)
        headers.cacheControl = "must-revalidate, post-check=0, pre-check=0"
        
        return ResponseEntity.ok()
            .headers(headers)
            .body(pdfBytes)
    }
}
