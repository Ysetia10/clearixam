package com.clearixam.service

import com.clearixam.dto.response.LLMResult
import com.clearixam.enums.AllowedSubject
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
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

    private val restTemplate = RestTemplate()
    private val objectMapper = ObjectMapper()

    @Value("\${gemini.api.key:}")
    private lateinit var geminiApiKey: String

    @Value("\${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private lateinit var geminiApiUrl: String

    private val timeout = Duration.ofSeconds(3)

    fun classifyWithLLM(cleanedText: String): LLMResult? {
        return try {
            if (geminiApiKey.isBlank()) return null

            val prompt = buildClassificationPrompt(cleanedText)
            val response = callGeminiAPI(prompt)
            val rawResult = parseGeminiResponse(response) ?: return null

            validateAndNormalizeLLMResult(rawResult)

        } catch (_: TimeoutException) {
            null
        } catch (_: Exception) {
            null
        }
    }

    private fun validateAndNormalizeLLMResult(rawResult: LLMResult): LLMResult? {
        return try {
            val normalizedSubject = topicNormalizer.normalizeSubject(rawResult.subject)
            val normalizedTopic = topicNormalizer.normalizeTopic(rawResult.topic)

            val allowedSubject = AllowedSubject.fromString(normalizedSubject) ?: return null
            if (normalizedTopic.isBlank()) return null

            val validDifficulty = when (rawResult.difficulty.lowercase()) {
                "easy", "medium", "hard" -> rawResult.difficulty
                else -> "Medium"
            }

            LLMResult(
                subject = allowedSubject.displayName,
                topic = normalizedTopic,
                difficulty = validDifficulty,
                keywords = rawResult.keywords.filter { it.isNotBlank() }
            )
        } catch (_: Exception) {
            null
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
                mapOf("parts" to listOf(mapOf("text" to prompt)))
            ),
            "generationConfig" to mapOf(
                "temperature" to 0.1,
                "maxOutputTokens" to 500,
                "topP" to 0.8,
                "topK" to 10
            )
        )

        val entity = HttpEntity(requestBody, headers)
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
            val jsonNode = objectMapper.readTree(response)
            val candidates = jsonNode.get("candidates")

            if (candidates == null || candidates.isEmpty) return null

            val parts = candidates[0].get("content")?.get("parts")
            if (parts == null || !parts.isArray) return null

            var jsonContent: String? = null
            for (part in parts) {
                val text = part.get("text")?.asText() ?: continue
                if (text.trimStart().startsWith("<think>")) continue
                try {
                    jsonContent = extractJsonFromContent(text)
                    break
                } catch (_: Exception) {
                }
            }

            if (jsonContent == null) return null

            val classificationJson = objectMapper.readTree(jsonContent)
            LLMResult(
                subject = classificationJson.get("subject")?.asText() ?: "Unknown",
                topic = classificationJson.get("topic")?.asText() ?: "Unknown",
                difficulty = classificationJson.get("difficulty")?.asText() ?: "Medium",
                keywords = parseKeywords(classificationJson.get("keywords"))
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun extractJsonFromContent(content: String): String {
        val cleaned = content.replace("```json", "").replace("```", "").trim()
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
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun isAvailable(): Boolean = geminiApiKey.isNotBlank()

    fun getServiceInfo(): Map<String, Any> = mapOf(
        "provider" to "Google Gemini",
        "model" to "gemini-2.5-flash",
        "available" to isAvailable(),
        "timeout" to "${timeout.seconds}s",
        "tier" to "free"
    )
}
