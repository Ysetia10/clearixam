package com.clearixam.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.regex.Pattern

@Service
class TextPreprocessor {
    
    private val logger = LoggerFactory.getLogger(TextPreprocessor::class.java)
    
    // Regex patterns for cleaning MCQ text
    private val optionPattern = Pattern.compile("\\b[A-D]\\)\\s*", Pattern.CASE_INSENSITIVE)
    private val numberedOptionPattern = Pattern.compile("\\b\\d+\\)\\s*", Pattern.CASE_INSENSITIVE)
    private val multipleSpacesPattern = Pattern.compile("\\s+")
    private val multipleLineBreaksPattern = Pattern.compile("\\n{2,}")
    private val specialCharsPattern = Pattern.compile("[^a-zA-Z0-9\\s]")
    
    /**
     * Clean raw OCR text to extract meaningful MCQ content
     */
    fun cleanMCQText(rawText: String): String {
        return try {
            logger.debug("Starting text preprocessing. Input length: ${rawText.length}")
            
            if (rawText.isBlank()) {
                logger.warn("Empty or blank text provided for preprocessing")
                return ""
            }
            
            var cleanedText = rawText
            
            // Step 1: Remove option markers (A), B), C), D))
            cleanedText = optionPattern.matcher(cleanedText).replaceAll(" ")
            
            // Step 2: Remove numbered options (1), 2), 3), etc.)
            cleanedText = numberedOptionPattern.matcher(cleanedText).replaceAll(" ")
            
            // Step 3: Extract question body (usually the first substantial line)
            cleanedText = extractQuestionBody(cleanedText)
            
            // Step 4: Remove special characters (keep alphanumeric and spaces)
            cleanedText = specialCharsPattern.matcher(cleanedText).replaceAll(" ")
            
            // Step 5: Normalize whitespace
            cleanedText = multipleLineBreaksPattern.matcher(cleanedText).replaceAll(" ")
            cleanedText = multipleSpacesPattern.matcher(cleanedText).replaceAll(" ")
            
            // Step 6: Convert to lowercase and trim
            cleanedText = cleanedText.lowercase().trim()
            
            logger.debug("Text preprocessing completed. Output length: ${cleanedText.length}")
            logger.debug("Cleaned text preview: ${cleanedText.take(100)}...")
            
            cleanedText
            
        } catch (e: Exception) {
            logger.error("Text preprocessing failed: ${e.message}", e)
            rawText.lowercase().trim() // Fallback to basic cleaning
        }
    }
    
    /**
     * Extract the main question body from MCQ text
     * Typically the question is before the options
     */
    private fun extractQuestionBody(text: String): String {
        val lines = text.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        
        if (lines.isEmpty()) return text
        
        // Find the longest meaningful line (likely the question)
        val questionLine = lines
            .filter { line -> 
                line.length > 10 && // Minimum length
                !line.matches(Regex("^[A-D]\\).*", RegexOption.IGNORE_CASE)) && // Not an option
                !line.matches(Regex("^\\d+\\).*")) // Not a numbered option
            }
            .maxByOrNull { it.length }
        
        return questionLine ?: lines.firstOrNull() ?: text
    }
    
    /**
     * Extract keywords from cleaned text for classification
     */
    fun extractKeywords(cleanedText: String): List<String> {
        return cleanedText
            .split("\\s+".toRegex())
            .filter { word -> 
                word.length > 2 && // Minimum word length
                !isStopWord(word) // Filter out common stop words
            }
            .distinct()
    }
    
    /**
     * Check if a word is a common stop word
     */
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