package com.clearixam.service

import com.clearixam.dto.response.ClassificationResult
import com.clearixam.enums.ClassificationStatus
import com.clearixam.enums.ClassificationSource
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Service
import kotlin.math.max

@Service
class RuleBasedClassifier {
    
    private val logger = LoggerFactory.getLogger(RuleBasedClassifier::class.java)
    
    // Lazy injection to avoid circular dependency
    @Lazy
    @Autowired
    private lateinit var mcqLearningService: MCQLearningService
    
    // Subject-wise keyword mappings for SSC
    private val subjectKeywords = mapOf(
        "English" to mapOf(
            "Grammar" to listOf(
                "synonym", "antonym", "idiom", "phrase", "grammar", "tense", "verb", "noun", 
                "adjective", "adverb", "preposition", "conjunction", "article", "pronoun",
                "sentence", "clause", "subject", "predicate", "active", "passive"
            ),
            "Vocabulary" to listOf(
                "meaning", "word", "vocabulary", "definition", "spelling", "pronunciation",
                "etymology", "root", "prefix", "suffix", "lexicon"
            ),
            "Comprehension" to listOf(
                "passage", "paragraph", "reading", "comprehension", "inference", "conclusion",
                "main idea", "theme", "author", "tone", "mood"
            )
        ),
        
        "Reasoning" to mapOf(
            "Logical Reasoning" to listOf(
                "series", "pattern", "sequence", "coding", "decoding", "blood relation",
                "direction", "ranking", "arrangement", "puzzle", "syllogism", "statement"
            ),
            "Verbal Reasoning" to listOf(
                "analogy", "classification", "odd one out", "completion", "logical sequence",
                "cause effect", "assertion reason"
            ),
            "Non-Verbal Reasoning" to listOf(
                "figure", "pattern", "mirror image", "water image", "rotation", "folding",
                "cutting", "embedded figure", "grouping"
            )
        ),
        
        "Quantitative Aptitude" to mapOf(
            "Arithmetic" to listOf(
                "percentage", "profit", "loss", "discount", "simple interest", "compound interest",
                "ratio", "proportion", "average", "mixture", "alligation", "partnership"
            ),
            "Algebra" to listOf(
                "equation", "quadratic", "linear", "polynomial", "factorization", "roots",
                "coefficient", "variable", "expression", "inequality"
            ),
            "Geometry" to listOf(
                "triangle", "circle", "rectangle", "square", "area", "perimeter", "volume",
                "surface area", "angle", "parallel", "perpendicular", "diagonal"
            ),
            "Data Interpretation" to listOf(
                "graph", "chart", "table", "data", "statistics", "mean", "median", "mode",
                "standard deviation", "probability", "permutation", "combination"
            )
        ),
        
        "General Awareness" to mapOf(
            "History" to listOf(
                "history", "ancient", "medieval", "modern", "mughal", "british", "independence",
                "freedom fighter", "revolt", "dynasty", "empire", "war", "battle", "civilization",
                "ruler", "king", "emperor", "sultanate", "colonial", "partition"
            ),
            "Geography" to listOf(
                "geography", "mountain", "river", "ocean", "continent", "country", "capital",
                "climate", "monsoon", "latitude", "longitude", "plateau", "desert", "nation",
                "neighbour", "neighbor", "border", "area", "largest", "smallest", "population",
                "state", "district", "city", "island", "peninsula", "bay", "strait", "valley",
                "forest", "wildlife", "national park", "sanctuary", "mineral", "coal", "iron",
                "himalaya", "ganga", "yamuna", "narmada", "godavari", "krishna", "cauvery",
                "arabian sea", "bay of bengal", "indian ocean", "deccan", "thar", "sundarbans"
            ),
            "Polity" to listOf(
                "constitution", "article", "amendment", "fundamental rights", "directive principles",
                "preamble", "constitutional", "supreme court", "high court", "judicial review",
                "parliament", "lok sabha", "rajya sabha", "speaker", "chairman", "bill",
                "ordinance", "session", "prorogation", "dissolution", "quorum",
                "president", "prime minister", "council of ministers", "governor", "chief minister",
                "cabinet", "executive", "administration", "bureaucracy",
                "judiciary", "judge", "court", "justice", "legal", "law", "trial", "appeal",
                "jurisdiction", "writ", "habeas corpus", "mandamus"
            ),
            "Economy" to listOf(
                "gdp", "gnp", "inflation", "deflation", "recession", "growth", "fiscal policy",
                "monetary policy", "budget", "deficit", "surplus", "debt", "reserve bank",
                "bank", "banking", "repo rate", "reverse repo", "crr", "slr", "npa",
                "credit", "loan", "deposit", "interest", "rbi", "monetary",
                "export", "import", "trade", "wto", "tariff", "quota", "balance of payments",
                "current account", "capital account", "foreign exchange", "currency",
                "development", "poverty", "unemployment", "human development index",
                "sustainable development", "planning", "five year plan", "niti aayog"
            ),
            "Science" to listOf(
                "physics", "chemistry", "biology", "science", "atom", "molecule", "cell",
                "organism", "force", "energy", "motion", "light", "sound", "electricity",
                "gravity", "magnetism", "photosynthesis", "respiration", "digestion", "circulation",
                "nervous system", "endocrine", "reproduction", "genetics", "evolution", "ecosystem"
            ),
            "Current Affairs" to listOf(
                "current", "recent", "news", "award", "prize", "summit", "conference",
                "policy", "scheme", "launch", "appointment", "resignation", "election",
                "government", "ministry", "minister"
            )
        )
    )
    
    /**
     * Classify text into subject, topic, and subtopic using rule-based keyword matching
     */
    fun classify(text: String): ClassificationResult {
        return try {
            logger.debug("Starting classification for text: ${text.take(100)}...")
            
            if (text.isBlank()) {
                return createUnknownResult("Empty text provided", text)
            }
            
            val words = text.lowercase().split("\\s+".toRegex()).toSet()
            val results = mutableListOf<ClassificationMatch>()
            
            // Score each subject-topic combination with improved matching
            subjectKeywords.forEach { (subject, topics) ->
                topics.forEach { (topic, keywords) ->
                    val matches = keywords.filter { keyword -> 
                        // More precise matching - look for whole word matches or exact substring matches
                        words.any { word -> 
                            word == keyword || // exact match
                            (word.contains(keyword) && keyword.length > 3) || // substring match for longer keywords
                            (keyword.contains(word) && word.length > 3) // reverse substring for longer words
                        }
                    }
                    
                    if (matches.isNotEmpty()) {
                        // Apply learning boost to matched keywords
                        val boostedScore = matches.sumOf { keyword ->
                            val boost = getKeywordBoostSafe(keyword)
                            // Give higher weight to longer, more specific keywords
                            val lengthWeight = when {
                                keyword.length >= 8 -> 2.0
                                keyword.length >= 5 -> 1.5
                                else -> 1.0
                            }
                            boost * lengthWeight
                        }
                        
                        // Context-aware scoring: boost geography for country/area questions
                        val contextBoost = when {
                            subject == "General Awareness" && topic == "Geography" && 
                            (text.contains("country", ignoreCase = true) || 
                             text.contains("nation", ignoreCase = true) ||
                             text.contains("area", ignoreCase = true) ||
                             text.contains("neighbour", ignoreCase = true) ||
                             text.contains("neighbor", ignoreCase = true) ||
                             text.contains("border", ignoreCase = true) ||
                             text.contains("largest", ignoreCase = true) ||
                             text.contains("smallest", ignoreCase = true)) -> 3.0
                            else -> 1.0
                        }
                        
                        val confidence = (boostedScore * contextBoost) / keywords.size
                        
                        results.add(ClassificationMatch(subject, topic, "", confidence, matches))
                        logger.debug("Match: $subject/$topic - keywords: $matches, boosted score: $boostedScore, context boost: $contextBoost, confidence: $confidence")
                    }
                }
            }
            
            // Find best match
            val bestMatch = results.maxByOrNull { it.confidence }
            
            if (bestMatch == null || bestMatch.confidence < 0.1) {
                return createUnknownResult("No significant keyword matches found", text)
            }
            
            logger.info("Classification completed: ${bestMatch.subject} -> ${bestMatch.topic} (confidence: ${bestMatch.confidence})")
            
            ClassificationResult(
                subject = bestMatch.subject,
                topic = bestMatch.topic,
                subtopic = bestMatch.subtopic,
                confidence = (bestMatch.confidence * 100).coerceAtMost(100.0),
                matchedKeywords = bestMatch.matchedKeywords,
                cleanedText = text,
                status = ClassificationStatus.LOW_CONFIDENCE, // Will be updated by ConfidenceEngine
                needsLLM = true, // Will be updated by ConfidenceEngine
                source = ClassificationSource.RULE,
                id = null
            )
            
        } catch (e: Exception) {
            logger.error("Classification failed: ${e.message}", e)
            createUnknownResult("Classification error: ${e.message}", text)
        }
    }

    /**
     * Classify text and return all candidates for ambiguity detection
     */
    fun classifyWithCandidates(text: String): ClassificationResultWithCandidates {
        return try {
            logger.debug("Starting classification with candidates for text: ${text.take(100)}...")
            
            if (text.isBlank()) {
                val unknownResult = createUnknownResult("Empty text provided", text)
                return ClassificationResultWithCandidates(unknownResult, emptyList())
            }
            
            val words = text.lowercase().split("\\s+".toRegex()).toSet()
            val results = mutableListOf<ClassificationMatch>()
            
            // Score each subject-topic combination with improved matching
            subjectKeywords.forEach { (subject, topics) ->
                topics.forEach { (topic, keywords) ->
                    val matches = keywords.filter { keyword -> 
                        // More precise matching - look for whole word matches or exact substring matches
                        words.any { word -> 
                            word == keyword || // exact match
                            (word.contains(keyword) && keyword.length > 3) || // substring match for longer keywords
                            (keyword.contains(word) && word.length > 3) // reverse substring for longer words
                        }
                    }
                    
                    if (matches.isNotEmpty()) {
                        // Apply learning boost to matched keywords
                        val boostedScore = matches.sumOf { keyword ->
                            val boost = getKeywordBoostSafe(keyword)
                            // Give higher weight to longer, more specific keywords
                            val lengthWeight = when {
                                keyword.length >= 8 -> 2.0
                                keyword.length >= 5 -> 1.5
                                else -> 1.0
                            }
                            boost * lengthWeight
                        }
                        
                        // Context-aware scoring: boost geography for country/area questions
                        val contextBoost = when {
                            subject == "General Awareness" && topic == "Geography" && 
                            (text.contains("country", ignoreCase = true) || 
                             text.contains("nation", ignoreCase = true) ||
                             text.contains("area", ignoreCase = true) ||
                             text.contains("neighbour", ignoreCase = true) ||
                             text.contains("neighbor", ignoreCase = true) ||
                             text.contains("border", ignoreCase = true) ||
                             text.contains("largest", ignoreCase = true) ||
                             text.contains("smallest", ignoreCase = true)) -> 3.0
                            else -> 1.0
                        }
                        
                        val confidence = (boostedScore * contextBoost) / keywords.size
                        
                        results.add(ClassificationMatch(subject, topic, "", confidence, matches))
                        logger.debug("Match: $subject/$topic - keywords: $matches, boosted score: $boostedScore, context boost: $contextBoost, confidence: $confidence")
                    }
                }
            }
            
            // Sort by confidence descending
            val sortedResults = results.sortedByDescending { it.confidence }
            
            // Find best match
            val bestMatch = sortedResults.firstOrNull()
            
            if (bestMatch == null || bestMatch.confidence < 0.1) {
                val unknownResult = createUnknownResult("No significant keyword matches found", text)
                return ClassificationResultWithCandidates(unknownResult, emptyList())
            }
            
            // Convert to candidates for confidence engine
            val candidates = sortedResults.take(5).map { match ->
                com.clearixam.service.ConfidenceEngine.ClassificationCandidate(
                    subject = match.subject,
                    topic = match.topic,
                    confidence = match.confidence * 100, // Convert to percentage
                    matchedKeywords = match.matchedKeywords
                )
            }
            
            logger.info("Classification completed: ${bestMatch.subject} -> ${bestMatch.topic} (confidence: ${bestMatch.confidence})")
            
            val primaryResult = ClassificationResult(
                subject = bestMatch.subject,
                topic = bestMatch.topic,
                subtopic = bestMatch.subtopic,
                confidence = (bestMatch.confidence * 100).coerceAtMost(100.0),
                matchedKeywords = bestMatch.matchedKeywords,
                cleanedText = text,
                status = ClassificationStatus.LOW_CONFIDENCE, // Will be updated by ConfidenceEngine
                needsLLM = true, // Will be updated by ConfidenceEngine
                source = ClassificationSource.RULE,
                id = null
            )
            
            ClassificationResultWithCandidates(primaryResult, candidates)
            
        } catch (e: Exception) {
            logger.error("Classification failed: ${e.message}", e)
            val errorResult = createUnknownResult("Classification error: ${e.message}", text)
            ClassificationResultWithCandidates(errorResult, emptyList())
        }
    }
    
    /**
     * Create result for unknown/unclassified content
     */
    private fun createUnknownResult(reason: String, cleanedText: String = ""): ClassificationResult {
        logger.warn("Creating unknown result: $reason")
        return ClassificationResult(
            subject = "UNKNOWN",
            topic = "UNKNOWN",
            subtopic = reason,
            confidence = 0.0,
            matchedKeywords = emptyList(),
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = ClassificationSource.RULE,
            id = null
        )
    }
    
    /**
     * Get all available subjects for reference
     */
    fun getAvailableSubjects(): Set<String> {
        return subjectKeywords.keys
    }
    
    /**
     * Get topics for a specific subject
     */
    fun getTopicsForSubject(subject: String): Set<String> {
        return subjectKeywords[subject]?.keys ?: emptySet()
    }
    
    /**
     * Get keywords for a specific subject-topic combination
     */
    fun getKeywordsForTopic(subject: String, topic: String): List<String> {
        return subjectKeywords[subject]?.get(topic) ?: emptyList()
    }
    
    /**
     * Internal data class for classification matching
     */
    private data class ClassificationMatch(
        val subject: String,
        val topic: String,
        val subtopic: String,
        val confidence: Double,
        val matchedKeywords: List<String>
    )
    
    /**
     * Data class for classification result with all candidates
     */
    data class ClassificationResultWithCandidates(
        val primaryResult: ClassificationResult,
        val allCandidates: List<com.clearixam.service.ConfidenceEngine.ClassificationCandidate>
    )
    
    /**
     * Safe method to get keyword boost, handles circular dependency
     */
    private fun getKeywordBoostSafe(keyword: String): Double {
        return try {
            if (::mcqLearningService.isInitialized) {
                mcqLearningService.getKeywordBoost(keyword)
            } else {
                1.0 // Default boost when learning service not available
            }
        } catch (e: Exception) {
            logger.debug("Failed to get keyword boost for '$keyword': ${e.message}")
            1.0 // Default boost on error
        }
    }
}