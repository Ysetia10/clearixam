package com.clearixam.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.web.multipart.MultipartFile
import java.util.Base64

@Service
class OCRService {

    private val logger = LoggerFactory.getLogger(OCRService::class.java)
    private val restTemplate = RestTemplate()
    private val objectMapper = ObjectMapper()

    @Value("\${gemini.api.key:}")
    private lateinit var geminiApiKey: String

    @Value("\${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent}")
    private lateinit var geminiApiUrl: String

    fun extractText(image: MultipartFile): String {
        return try {
            logger.info("Starting OCR extraction via Gemini Vision for: ${image.originalFilename}")

            if (image.isEmpty) {
                logger.warn("Empty image file provided")
                return ""
            }

            if (!isValidImageType(image)) {
                logger.warn("Invalid image type: ${image.contentType}")
                return ""
            }

            if (geminiApiKey.isBlank()) {
                logger.error("Gemini API key not configured — cannot perform OCR")
                return ""
            }

            val base64Image = Base64.getEncoder().encodeToString(image.bytes)
            val mimeType = image.contentType ?: "image/jpeg"

            val requestBody = mapOf(
                "contents" to listOf(
                    mapOf(
                        "parts" to listOf(
                            mapOf("text" to "Extract all text from this image exactly as it appears. Return only the raw text, no commentary."),
                            mapOf(
                                "inline_data" to mapOf(
                                    "mime_type" to mimeType,
                                    "data" to base64Image
                                )
                            )
                        )
                    )
                ),
                "generationConfig" to mapOf(
                    "temperature" to 0.0,
                    "maxOutputTokens" to 1024
                )
            )

            val headers = HttpHeaders().apply {
                contentType = MediaType.APPLICATION_JSON
            }

            val entity = HttpEntity(requestBody, headers)
            val url = "$geminiApiUrl?key=$geminiApiKey"

            val response = restTemplate.exchange(url, HttpMethod.POST, entity, String::class.java)

            if (response.statusCode != HttpStatus.OK) {
                logger.error("Gemini Vision API returned status: ${response.statusCode}")
                return ""
            }

            val jsonNode = objectMapper.readTree(response.body)
            val extractedText = jsonNode
                .get("candidates")
                ?.get(0)
                ?.get("content")
                ?.get("parts")
                ?.get(0)
                ?.get("text")
                ?.asText()
                ?.trim()
                ?: ""

            logger.info("OCR extraction completed. Text length: ${extractedText.length}")
            extractedText

        } catch (e: Exception) {
            logger.error("OCR extraction failed: ${e.message}", e)
            ""
        }
    }

    private fun isValidImageType(file: MultipartFile): Boolean {
        val supportedTypes = setOf(
            "image/jpeg", "image/jpg", "image/png",
            "image/bmp", "image/tiff", "image/gif", "image/webp"
        )
        return file.contentType in supportedTypes
    }

    fun getOCRInfo(): Map<String, String> = mapOf(
        "engine" to "Gemini Vision API",
        "status" to if (geminiApiKey.isNotBlank()) "available" else "unavailable (no API key)",
        "language" to "auto-detect"
    )
}
