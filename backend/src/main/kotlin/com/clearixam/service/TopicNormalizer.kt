package com.clearixam.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class TopicNormalizer {
    
    private val logger = LoggerFactory.getLogger(TopicNormalizer::class.java)
    
    // Topic normalization mappings
    private val topicMappings = mapOf(
        // Economics variations
        "economics" to "Economy",
        "macroeconomics" to "Economy", 
        "microeconomics" to "Economy",
        "economic" to "Economy",
        
        // English variations
        "english vocabulary" to "Vocabulary",
        "english grammar" to "Grammar",
        "vocabulary" to "Vocabulary",
        "grammar" to "Grammar",
        "comprehension" to "Comprehension",
        
        // Reasoning variations
        "logical reasoning" to "Logical Reasoning",
        "verbal reasoning" to "Verbal Reasoning", 
        "non-verbal reasoning" to "Non-Verbal Reasoning",
        "reasoning" to "Logical Reasoning",
        
        // Quantitative variations
        "arithmetic" to "Arithmetic",
        "algebra" to "Algebra", 
        "geometry" to "Geometry",
        "data interpretation" to "Data Interpretation",
        "quantitative" to "Arithmetic",
        "quant" to "Arithmetic",
        
        // General Knowledge variations
        "history" to "History",
        "geography" to "Geography",
        "science" to "Science",
        "current affairs" to "Current Affairs",
        "general knowledge" to "General Knowledge",
        "gk" to "General Knowledge",
        
        // Polity variations
        "polity" to "Polity",
        "constitution" to "Constitution",
        "parliament" to "Parliament",
        "executive" to "Executive",
        "judiciary" to "Judiciary"
    )
    
    /**
     * Normalize topic name to standard format
     */
    fun normalizeTopic(topic: String?): String {
        if (topic.isNullOrBlank()) {
            logger.debug("Empty topic provided for normalization")
            return "General"
        }
        
        val cleanTopic = topic.trim().lowercase()
        val normalized = topicMappings[cleanTopic] ?: topic.trim()
        
        if (normalized != topic.trim()) {
            logger.debug("Normalized topic: '$topic' -> '$normalized'")
        }
        
        return normalized
    }
    
    /**
     * Normalize subject name to standard format
     */
    fun normalizeSubject(subject: String?): String {
        if (subject.isNullOrBlank()) {
            logger.debug("Empty subject provided for normalization")
            return "General Knowledge"
        }
        
        val cleanSubject = subject.trim()
        
        // Map common variations to standard names
        val normalized = when (cleanSubject.lowercase()) {
            "economics", "economy" -> "Economy"
            "quantitative aptitude", "quant", "quantitative" -> "Quantitative Aptitude"
            "reasoning" -> "Reasoning"
            "english" -> "English"
            "general knowledge", "gk", "gs" -> "General Knowledge"
            "polity" -> "Polity"
            else -> cleanSubject
        }
        
        if (normalized != cleanSubject) {
            logger.debug("Normalized subject: '$subject' -> '$normalized'")
        }
        
        return normalized
    }
    
    /**
     * Validate and normalize subtopic
     */
    fun normalizeSubtopic(subtopic: String?): String? {
        if (subtopic.isNullOrBlank()) {
            return null
        }
        
        val cleaned = subtopic.trim()
        return if (cleaned.length < 2) null else cleaned
    }
    
    /**
     * Get all standard topic names for a subject
     */
    fun getStandardTopicsForSubject(subject: String): List<String> {
        return when (subject.lowercase()) {
            "economy", "economics" -> listOf("Macroeconomics", "Banking", "Trade", "Development")
            "quantitative aptitude" -> listOf("Arithmetic", "Algebra", "Geometry", "Data Interpretation")
            "reasoning" -> listOf("Logical Reasoning", "Verbal Reasoning", "Non-Verbal Reasoning")
            "english" -> listOf("Grammar", "Vocabulary", "Comprehension")
            "general knowledge" -> listOf("History", "Geography", "Science", "Current Affairs")
            "polity" -> listOf("Constitution", "Parliament", "Executive", "Judiciary")
            else -> emptyList()
        }
    }
}