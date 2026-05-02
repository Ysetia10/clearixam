package com.clearixam.service

import com.clearixam.dto.response.LLMResult
import com.clearixam.enums.AllowedSubject
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.time.Duration
import java.util.concurrent.TimeoutException

@Service
class LLMService(
    private val topicNormalizer: TopicNormalizer
) {
    
    private val logger = LoggerFactory.getLogger(LLMService::class.java)
    private val restTemplate = RestTemplate()
    private val objectMapper = ObjectMapper()
    
    @Value("\${gemini.api.key:}")
    private lateinit var geminiApiKey: String
    
    @Value("\${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private lateinit var geminiApiUrl: String
    
    private val timeout = Duration.ofSeconds(3)
    
    fun classifyWithLLM(cleanedText: String): LLMResult? {
        return try {
            logger.info("LLM_CALL_START text_length=${cleanedText.length}")
            val startTime = System.currentTimeMillis()
            
            if (geminiApiKey.isBlank()) {
                logger.warn("LLM_UNAVAILABLE reason=no_api_key")
                return null
            }
            
            val prompt = buildClassificationPrompt(cleanedText)
            val response = callGeminiAPI(prompt)
            val rawResult = parseGeminiResponse(response)
            
            if (rawResult == null) {
                logger.warn("LLM_PARSE_FAILED text='${cleanedText.take(50)}'")
                return null
            }
            
            val validatedResult = validateAndNormalizeLLMResult(rawResult, cleanedText)
            
            val processingTime = System.currentTimeMillis() - startTime
            if (validatedResult != null) {
                logger.info("LLM_SUCCESS subject=${validatedResult.subject} topic=${validatedResult.topic} time_ms=$processingTime")
            } else {
                logger.warn("LLM_VALIDATION_FAILED original_subject=${rawResult.subject} time_ms=$processingTime")
            }
            
            validatedResult
            
        } catch (e: TimeoutException) {
            logger.warn("LLM_TIMEOUT duration_ms=${timeout.toMillis()}")
            null
        } catch (e: Exception) {
            logger.error("LLM_ERROR message='${e.message}'", e)
            null
        }
    }
    
    private fun validateAndNormalizeLLMResult(rawResult: LLMResult, cleanedText: String): LLMResult? {
        try {
            val normalizedSubject = topicNormalizer.normalizeSubject(rawResult.subject)
            val normalizedTopic = topicNormalizer.normalizeTopic(rawResult.topic)
            
            val allowedSubject = AllowedSubject.fromString(normalizedSubject)
            if (allowedSubject == null) {
                logger.warn("LLM_INVALID_SUBJECT subject='$normalizedSubject' allowed=${AllowedSubject.getAllowedSubjects()}")
                return null
            }
            
            if (normalizedTopic.isBlank()) {
                logger.warn("LLM_EMPTY_TOPIC subject='$normalizedSubject'")
                return null
            }
            
            val validDifficulty = when (rawResult.difficulty.lowercase()) {
                "easy", "medium", "hard" -> rawResult.difficulty
                else -> "Medium" // Default fallback
            }
            
            logger.debug("LLM_NORMALIZED original_subject='${rawResult.subject}' normalized_subject='$normalizedSubject' topic='$normalizedTopic'")
            
            return LLMResult(
                subject = allowedSubject.displayName,
                topic = normalizedTopic,
                difficulty = validDifficulty,
                keywords = rawResult.keywords.filter { it.isNotBlank() }
            )
            
        } catch (e: Exception) {
            logger.error("LLM_VALIDATION_ERROR message='${e.message}'", e)
            return null
        }
    }
    
    private fun buildClassificationPrompt(cleanedText: String): String {
        return """
You are an MCQ classifier for SSC exams. Classify the question below into JSON.
Return ONLY valid JSON, no markdown, no explanation.

Allowed subjects (use EXACTLY one of these):
- "English" (grammar, vocabulary, antonym, synonym, comprehension, fill in the blank, error detection)
- "Reasoning" (logical, verbal, non-verbal, series, coding, analogy, puzzle)
- "Quantitative Aptitude" (maths, arithmetic, algebra, geometry, data interpretation)
- "General Awareness" (history, geography, polity, economy, science, current affairs)

JSON format:
{"subject":"...","topic":"...","difficulty":"Easy|Medium|Hard","keywords":["w1","w2","w3"]}

MCQ: $cleanedText
        """.trimIndent()
    }
    
    private fun callGeminiAPI(prompt: String): String {
        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("x-goog-api-key", geminiApiKey)
        }
        
        val requestBody = mapOf(
            "contents" to listOf(
                mapOf(
                    "parts" to listOf(
                        mapOf("text" to prompt)
                    )
                )
            ),
            "generationConfig" to mapOf(
                "temperature" to 0.1,
                "maxOutputTokens" to 500,
                "topP" to 0.8,
                "topK" to 10
            )
        )
        
        val entity = HttpEntity(requestBody, headers)
        
        logger.debug("Calling Gemini API with prompt length: ${prompt.length}")
        
        val response = restTemplate.exchange(
            "$geminiApiUrl?key=$geminiApiKey",
            HttpMethod.POST,
            entity,
            String::class.java
        )
        
        if (response.statusCode != HttpStatus.OK) {
            throw RuntimeException("Gemini API call failed with status: ${response.statusCode}")
        }
        
        return response.body ?: throw RuntimeException("Empty response from Gemini API")
    }
    
    private fun parseGeminiResponse(response: String): LLMResult? {
        return try {
            logger.debug("Parsing Gemini response: ${response.take(200)}...")
            
            val jsonNode = objectMapper.readTree(response)
            val candidates = jsonNode.get("candidates")
            
            if (candidates == null || candidates.isEmpty) {
                logger.warn("No candidates found in Gemini response")
                return null
            }

            // Iterate all parts — thinking models put <think> in part[0], actual output in a later part
            val parts = candidates[0].get("content")?.get("parts")
            if (parts == null || !parts.isArray) {
                logger.warn("No parts found in Gemini response")
                return null
            }

            var jsonContent: String? = null
            for (part in parts) {
                val text = part.get("text")?.asText() ?: continue
                // Skip pure thinking blocks
                if (text.trimStart().startsWith("<think>")) continue
                try {
                    jsonContent = extractJsonFromContent(text)
                    break
                } catch (_: Exception) {
                    // this part had no JSON, try next
                }
            }

            if (jsonContent == null) {
                logger.warn("No JSON found in any response part")
                return null
            }

            val classificationJson = objectMapper.readTree(jsonContent)
            
            LLMResult(
                subject = classificationJson.get("subject")?.asText() ?: "Unknown",
                topic = classificationJson.get("topic")?.asText() ?: "Unknown",
                difficulty = classificationJson.get("difficulty")?.asText() ?: "Medium",
                keywords = parseKeywords(classificationJson.get("keywords"))
            )
            
        } catch (e: Exception) {
            logger.error("Failed to parse Gemini response: ${e.message}", e)
            null
        }
    }
    
    private fun extractJsonFromContent(content: String): String {
        val cleaned = content
            .replace("```json", "")
            .replace("```", "")
            .trim()
        
        val startIndex = cleaned.indexOf('{')
        val endIndex = cleaned.lastIndexOf('}')
        
        if (startIndex == -1 || endIndex == -1 || startIndex >= endIndex) {
            throw RuntimeException("No valid JSON found in response")
        }
        
        return cleaned.substring(startIndex, endIndex + 1)
    }
    
    private fun parseKeywords(keywordsNode: JsonNode?): List<String> {
        return try {
            when {
                keywordsNode == null -> emptyList()
                keywordsNode.isArray -> keywordsNode.map { it.asText() }
                keywordsNode.isTextual -> listOf(keywordsNode.asText())
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.warn("Failed to parse keywords: ${e.message}")
            emptyList()
        }
    }
    
    fun isAvailable(): Boolean {
        return geminiApiKey.isNotBlank()
    }
    
    fun getServiceInfo(): Map<String, Any> {
        return mapOf(
            "provider" to "Google Gemini",
            "model" to "gemini-2.5-flash",
            "available" to isAvailable(),
            "timeout" to "${timeout.seconds}s",
            "tier" to "free"
        )
    }
}