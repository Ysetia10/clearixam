package com.clearixam.service

import com.clearixam.entity.MCQClassification
import com.clearixam.repository.MCQClassificationRepository
import com.fasterxml.jackson.databind.ObjectMapper
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
        if (existing != null) return existing

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

        return mcqClassificationRepository.save(classification)
    }

    fun correctClassification(
        id: Long,
        correctedSubject: String,
        correctedTopic: String
    ): MCQClassification? {
        val classification = mcqClassificationRepository.findById(id).orElse(null) ?: return null

        val normalizedSubject = topicNormalizer.normalizeSubject(correctedSubject)
        val normalizedTopic = topicNormalizer.normalizeTopic(correctedTopic)

        val corrected = classification.copy(
            userCorrected = true,
            correctedSubject = normalizedSubject,
            correctedTopic = normalizedTopic,
            correctedAt = LocalDateTime.now()
        )

        val saved = mcqClassificationRepository.save(corrected)

        if (classification.confidence >= MIN_CONFIDENCE_FOR_LEARNING) {
            learnFromCorrection(saved)
        }

        return saved
    }

    private fun learnFromCorrection(correction: MCQClassification) {
        try {
            val questionKeywords = extractKeywordsFromText(correction.questionText)
            if (questionKeywords.isEmpty()) return

            val targetClassification = "${correction.correctedSubject}/${correction.correctedTopic}"

            questionKeywords.forEach { keyword ->
                val keywordClassificationKey = "$keyword->$targetClassification"
                val currentCount = keywordClassificationCounts.getOrDefault(keywordClassificationKey, 0) + 1
                keywordClassificationCounts[keywordClassificationKey] = currentCount

                if (currentCount >= 2 || keywordClassificationCounts.size < 10) {
                    val currentBoost = keywordBoosts.getOrDefault(keyword, 1.0)
                    keywordBoosts[keyword] = (currentBoost + 0.1).coerceAtMost(2.0)
                }
            }
        } catch (_: Exception) {
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
            .replace(Regex("[^a-zA-Z\\s]"), " ")
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

            recordsWithoutHash.forEach { record ->
                val textHash = generateTextHash(record.questionText.lowercase().trim())
                mcqClassificationRepository.save(record.copy(textHash = textHash))
            }
        } catch (_: Exception) {
        }
    }

    private fun loadExistingCorrections() {
        try {
            mcqClassificationRepository.findByUserCorrectedTrue().forEach { learnFromCorrection(it) }
        } catch (_: Exception) {
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
        val classification = mcqClassificationRepository.findById(id).orElse(null) ?: return null
        return mcqClassificationRepository.save(classification.copy(outcomeStatus = outcome))
    }

    private fun generateTextHash(text: String): String {
        val md = MessageDigest.getInstance("MD5")
        val digest = md.digest(text.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }
}
