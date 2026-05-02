package com.clearixam.service

import org.springframework.stereotype.Service
import java.util.regex.Pattern

@Service
class TextPreprocessor {

    private val optionPattern = Pattern.compile("\\b[A-D]\\)\\s*", Pattern.CASE_INSENSITIVE)
    private val numberedOptionPattern = Pattern.compile("\\b\\d+\\)\\s*", Pattern.CASE_INSENSITIVE)
    private val multipleSpacesPattern = Pattern.compile("\\s+")
    private val multipleLineBreaksPattern = Pattern.compile("\\n{2,}")
    private val specialCharsPattern = Pattern.compile("[^a-zA-Z0-9\\s]")

    fun cleanMCQText(rawText: String): String {
        return try {
            if (rawText.isBlank()) return ""

            var cleanedText = rawText
            cleanedText = optionPattern.matcher(cleanedText).replaceAll(" ")
            cleanedText = numberedOptionPattern.matcher(cleanedText).replaceAll(" ")
            cleanedText = extractQuestionBody(cleanedText)
            cleanedText = specialCharsPattern.matcher(cleanedText).replaceAll(" ")
            cleanedText = multipleLineBreaksPattern.matcher(cleanedText).replaceAll(" ")
            cleanedText = multipleSpacesPattern.matcher(cleanedText).replaceAll(" ")
            cleanedText.lowercase().trim()
        } catch (_: Exception) {
            rawText.lowercase().trim()
        }
    }

    private fun extractQuestionBody(text: String): String {
        val lines = text.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        if (lines.isEmpty()) return text

        val questionLine = lines
            .filter { line ->
                line.length > 10 &&
                !line.matches(Regex("^[A-D]\\).*", RegexOption.IGNORE_CASE)) &&
                !line.matches(Regex("^\\d+\\).*"))
            }
            .maxByOrNull { it.length }

        return questionLine ?: lines.firstOrNull() ?: text
    }

    fun extractKeywords(cleanedText: String): List<String> {
        return cleanedText
            .split("\\s+".toRegex())
            .filter { word -> word.length > 2 && !isStopWord(word) }
            .distinct()
    }

    private fun isStopWord(word: String): Boolean {
        val stopWords = setOf(
            "the", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "can", "must", "shall",
            "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "up", "about", "into", "through",
            "during", "before", "after", "above", "below", "between",
            "what", "which", "who", "when", "where", "why", "how"
        )
        return word.lowercase() in stopWords
    }
}
