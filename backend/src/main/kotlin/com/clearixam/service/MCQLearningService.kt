package com.clearixam.service

import com.clearixam.entity.MCQClassification
import com.clearixam.repository.MCQClassificationRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentHashMap

@Service
class MCQLearningService(
    private val mcqClassificationRepository: MCQClassificationRepository,
    private val objectMapper: ObjectMapper,
    private val topicNormalizer: TopicNormalizer
) {
    
    private val logger = LoggerFactory.getLogger(MCQLearningService::class.java)
    
    private val keywordBoosts = ConcurrentHashMap<String, Double>()
    
    private val keywordClassificationCounts = ConcurrentHashMap<String, Int>()
    
    private val MIN_CONFIDENCE_FOR_LEARNING = 30.0
    
    init {
        populateTextHashesForExistingRecords()
        loadExistingCorrections()
    }
    
    fun saveClassification(
        questionText: String,
        subject: String,
        topic: String,
        source: com.clearixam.entity.ClassificationSource,
        confidence: Double,
        matchedKeywords: List<String>
    ): MCQClassification {
        
        val cleanedText = questionText.lowercase().trim()
        val textHash = generateTextHash(cleanedText)
        
        val existing = mcqClassificationRepository.findByTextHash(textHash)
        if (existing != null) {
            logger.info("DUPLICATE_DETECTED hash=$textHash existing_id=${existing.id}")
            return existing
        }
        
        val normalizedSubject = topicNormalizer.normalizeSubject(subject)
        val normalizedTopic = topicNormalizer.normalizeTopic(topic)
        
        val keywordsJson = if (matchedKeywords.isNotEmpty()) {
            objectMapper.writeValueAsString(matchedKeywords)
        } else null
        
        val classification = MCQClassification(
            questionText = cleanedText,
            subject = normalizedSubject,
            topic = normalizedTopic,
            source = source,
            confidence = confidence,
            matchedKeywords = keywordsJson,
            textHash = textHash
        )
        
        val saved = mcqClassificationRepository.save(classification)
        logger.info("CLASSIFICATION_SAVED id=${saved.id} subject='$normalizedSubject' topic='$normalizedTopic' confidence=$confidence source=$source")
        
        return saved
    }
    
    fun correctClassification(
        id: Long,
        correctedSubject: String,
        correctedTopic: String
    ): MCQClassification? {
        
        val classification = mcqClassificationRepository.findById(id).orElse(null)
        if (classification == null) {
            logger.warn("CORRECTION_NOT_FOUND id=$id")
            return null
        }
        
        val normalizedSubject = topicNormalizer.normalizeSubject(correctedSubject)
        val normalizedTopic = topicNormalizer.normalizeTopic(correctedTopic)
        
        val corrected = classification.copy(
            userCorrected = true,
            correctedSubject = normalizedSubject,
            correctedTopic = normalizedTopic,
            correctedAt = LocalDateTime.now()
        )
        
        val saved = mcqClassificationRepository.save(corrected)
        logger.info("CORRECTION_APPLIED id=${saved.id} original='${classification.subject}/${classification.topic}' corrected='$normalizedSubject/$normalizedTopic' confidence=${classification.confidence}")
        
        if (classification.confidence >= MIN_CONFIDENCE_FOR_LEARNING) {
            learnFromCorrection(saved)
        } else {
            logger.info("LEARNING_SKIPPED id=${saved.id} reason=low_confidence confidence=${classification.confidence}")
        }
        
        return saved
    }
    
    private fun learnFromCorrection(correction: MCQClassification) {
        try {
            val questionKeywords = extractKeywordsFromText(correction.questionText)
            
            if (questionKeywords.isEmpty()) {
                logger.debug("LEARNING_NO_KEYWORDS id=${correction.id}")
                return
            }
            
            val targetClassification = "${correction.correctedSubject}/${correction.correctedTopic}"
            var boostedCount = 0
            
            questionKeywords.forEach { keyword ->
                val keywordClassificationKey = "$keyword->$targetClassification"
                
                val currentCount = keywordClassificationCounts.getOrDefault(keywordClassificationKey, 0) + 1
                keywordClassificationCounts[keywordClassificationKey] = currentCount
                
                if (currentCount >= 2 || keywordClassificationCounts.size < 10) {
                    val currentBoost = keywordBoosts.getOrDefault(keyword, 1.0)
                    val newBoost = (currentBoost + 0.1).coerceAtMost(2.0)
                    keywordBoosts[keyword] = newBoost
                    boostedCount++
                    
                    logger.debug("KEYWORD_BOOSTED keyword='$keyword' boost=${newBoost} count=$currentCount target='$targetClassification'")
                } else {
                    logger.debug("KEYWORD_BOOST_DEFERRED keyword='$keyword' count=$currentCount target='$targetClassification'")
                }
            }
            
            logger.info("LEARNING_APPLIED id=${correction.id} keywords_extracted=${questionKeywords.size} keywords_boosted=$boostedCount target='$targetClassification'")
            
        } catch (e: Exception) {
            logger.error("LEARNING_ERROR id=${correction.id} message='${e.message}'", e)
        }
    }
    
    private fun extractKeywordsFromText(text: String): List<String> {
        val stopWords = setOf(
            "what", "which", "the", "is", "are", "of", "in", "on", "at", "to", "for", "with", "by",
            "from", "up", "about", "into", "through", "during", "before", "after", "above", "below", 
            "between", "among", "this", "that", "these", "those", "i", "you", "he", "she", "it", 
            "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", 
            "their", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", 
            "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", 
            "can", "shall", "a", "an", "and", "or", "but", "not", "no", "yes", "if", "then",
            "how", "when", "where", "why", "who", "whom", "whose", "whether",
            "following", "given", "above", "below", "correct", "incorrect", "true", "false",
            "option", "options", "choose", "select", "find", "calculate", "determine"
        )
        
        return text.lowercase()
            .replace(Regex("[^a-zA-Z\\s]"), " ") // Remove non-alphabetic chars
            .split("\\s+".toRegex())
            .filter { word ->
                word.length >= 3 &&
                !stopWords.contains(word) &&
                word.matches(Regex("[a-z]+"))
            }
            .distinct()
            .take(10)
    }
    
    fun getKeywordBoost(keyword: String): Double {
        return keywordBoosts.getOrDefault(keyword.lowercase(), 1.0)
    }
    
    private fun populateTextHashesForExistingRecords() {
        try {
            val recordsWithoutHash = mcqClassificationRepository.findAll()
                .filter { it.textHash.isNullOrBlank() }
            
            if (recordsWithoutHash.isNotEmpty()) {
                logger.info("Populating text hashes for ${recordsWithoutHash.size} existing records")
                
                recordsWithoutHash.forEach { record ->
                    val textHash = generateTextHash(record.questionText.lowercase().trim())
                    val updated = record.copy(textHash = textHash)
                    mcqClassificationRepository.save(updated)
                }
                
                logger.info("Successfully populated text hashes for ${recordsWithoutHash.size} records")
            }
        } catch (e: Exception) {
            logger.error("Failed to populate text hashes for existing records: ${e.message}", e)
        }
    }
    
    private fun loadExistingCorrections() {
        try {
            val corrections = mcqClassificationRepository.findByUserCorrectedTrue()
            logger.info("Loading ${corrections.size} existing corrections for learning")
            
            corrections.forEach { correction ->
                learnFromCorrection(correction)
            }
            
            logger.info("Loaded learning data: ${keywordBoosts.size} keyword boosts")
            
        } catch (e: Exception) {
            logger.error("Failed to load existing corrections: ${e.message}", e)
        }
    }
    
    fun getLearningStats(): Map<String, Any> {
        val totalClassifications = mcqClassificationRepository.count()
        val correctedClassifications = mcqClassificationRepository.countByUserCorrectedTrue()
        val accuracyRate = if (totalClassifications > 0) {
            ((totalClassifications - correctedClassifications).toDouble() / totalClassifications * 100)
        } else 0.0
        
        return mapOf(
            "totalClassifications" to totalClassifications,
            "correctedClassifications" to correctedClassifications,
            "accuracyRate" to String.format("%.1f%%", accuracyRate),
            "keywordBoosts" to keywordBoosts.size,
            "avgBoost" to if (keywordBoosts.isNotEmpty()) {
                String.format("%.2f", keywordBoosts.values.average())
            } else "1.00"
        )
    }
    
    fun getRecentCorrections(limit: Int = 10): List<Map<String, Any>> {
        return mcqClassificationRepository.findByUserCorrectedTrue()
            .sortedByDescending { it.correctedAt }
            .take(limit)
            .map { correction ->
                mapOf(
                    "id" to correction.id,
                    "questionText" to correction.questionText.take(50) + "...",
                    "original" to "${correction.subject}/${correction.topic}",
                    "corrected" to "${correction.correctedSubject}/${correction.correctedTopic}",
                    "correctedAt" to correction.correctedAt.toString()
                )
            }
    }
    
    fun setOutcome(id: Long, outcome: com.clearixam.entity.OutcomeStatus): MCQClassification? {
        val classification = mcqClassificationRepository.findById(id).orElse(null)
        if (classification == null) {
            logger.warn("OUTCOME_NOT_FOUND id=$id")
            return null
        }
        
        val updated = classification.copy(outcomeStatus = outcome)
        val saved = mcqClassificationRepository.save(updated)
        
        logger.info("OUTCOME_SET id=${saved.id} outcome=${outcome.name} subject='${classification.subject}' topic='${classification.topic}'")
        return saved
    }
    
    private fun generateTextHash(text: String): String {
        val md = MessageDigest.getInstance("MD5")
        val digest = md.digest(text.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }
}