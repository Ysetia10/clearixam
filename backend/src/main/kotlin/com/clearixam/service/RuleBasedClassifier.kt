package com.clearixam.service

import com.clearixam.dto.response.ClassificationResult
import com.clearixam.enums.ClassificationStatus
import com.clearixam.enums.ClassificationSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Service

@Service
class RuleBasedClassifier {

    @Lazy
    @Autowired
    private lateinit var mcqLearningService: MCQLearningService

    private val subjectKeywords = mapOf(
        "English" to mapOf(
            "Grammar" to listOf(
                "synonym", "antonym", "idiom", "phrase", "grammar", "tense", "verb", "noun",
                "adjective", "adverb", "preposition", "conjunction", "article", "pronoun",
                "sentence", "clause", "predicate", "active voice", "passive voice",
                "fill in the blank", "fill the blank", "correct sentence", "incorrect sentence",
                "error detection", "spot the error", "one word substitution", "parts of speech"
            ),
            "Vocabulary" to listOf(
                "meaning", "vocabulary", "definition", "spelling", "word meaning",
                "etymology", "prefix", "suffix", "lexicon", "appropriate word",
                "most appropriate", "correctly spelt", "misspelt", "correctly spelled"
            ),
            "Comprehension" to listOf(
                "passage", "paragraph", "reading comprehension", "inference", "conclusion",
                "main idea", "theme", "author", "tone", "mood", "rearrange", "jumbled"
            )
        ),

        "Reasoning" to mapOf(
            "Logical Reasoning" to listOf(
                "series", "number series", "letter series", "sequence", "coding decoding",
                "blood relation", "direction sense", "ranking", "arrangement", "puzzle",
                "syllogism", "statement conclusion", "statement assumption", "logical"
            ),
            "Verbal Reasoning" to listOf(
                "analogy", "odd one out", "classification", "completion",
                "cause and effect", "assertion reason"
            ),
            "Non-Verbal Reasoning" to listOf(
                "mirror image", "water image", "rotation", "paper folding",
                "paper cutting", "embedded figure", "figure grouping", "matrix"
            )
        ),

        "Quantitative Aptitude" to mapOf(
            "Arithmetic" to listOf(
                "percentage", "profit and loss", "discount", "simple interest", "compound interest",
                "ratio and proportion", "average", "mixture", "alligation", "partnership",
                "time and work", "time and distance", "speed", "pipes and cisterns"
            ),
            "Algebra" to listOf(
                "equation", "quadratic", "linear equation", "polynomial", "factorization",
                "coefficient", "variable", "expression", "inequality", "algebraic"
            ),
            "Geometry" to listOf(
                "triangle", "circle", "rectangle", "square", "area", "perimeter", "volume",
                "surface area", "angle", "parallel lines", "perpendicular", "diagonal",
                "trapezium", "rhombus", "polygon", "cylinder", "cone", "sphere"
            ),
            "Data Interpretation" to listOf(
                "bar graph", "pie chart", "line graph", "table", "data interpretation",
                "statistics", "mean", "median", "mode", "standard deviation",
                "probability", "permutation", "combination"
            )
        ),

        "General Awareness" to mapOf(
            "History" to listOf(
                "history", "ancient", "medieval", "modern history", "mughal", "british india",
                "independence", "freedom fighter", "revolt", "dynasty", "empire", "war", "battle",
                "civilization", "ruler", "king", "emperor", "sultanate", "colonial", "partition",
                "harappan", "vedic", "maurya", "gupta", "maratha", "sikh"
            ),
            "Geography" to listOf(
                "geography", "mountain", "river", "ocean", "continent", "country", "capital city",
                "climate", "monsoon", "latitude", "longitude", "plateau", "desert", "nation",
                "neighbour", "neighbor", "border", "largest", "smallest", "population",
                "state", "district", "island", "peninsula", "bay", "strait", "valley",
                "forest", "wildlife", "national park", "sanctuary", "mineral", "coal", "iron ore",
                "himalaya", "ganga", "yamuna", "narmada", "godavari", "krishna", "cauvery",
                "arabian sea", "bay of bengal", "indian ocean", "deccan", "thar", "sundarbans",
                "tropic of cancer", "equator", "prime meridian"
            ),
            "Polity" to listOf(
                "constitution", "constitutional", "amendment", "fundamental rights",
                "directive principles", "preamble", "supreme court", "high court", "judicial review",
                "parliament", "lok sabha", "rajya sabha", "speaker", "bill", "ordinance",
                "president", "prime minister", "council of ministers", "governor", "chief minister",
                "cabinet", "bureaucracy", "judiciary", "judge", "justice", "writ",
                "habeas corpus", "mandamus", "election commission", "comptroller"
            ),
            "Economy" to listOf(
                "gdp", "gnp", "inflation", "deflation", "recession", "fiscal policy",
                "monetary policy", "budget", "deficit", "surplus", "reserve bank", "rbi",
                "repo rate", "reverse repo", "crr", "slr", "npa", "banking",
                "export", "import", "wto", "tariff", "balance of payments",
                "foreign exchange", "poverty", "unemployment", "human development index",
                "niti aayog", "five year plan", "economic survey"
            ),
            "Science" to listOf(
                "physics", "chemistry", "biology", "atom", "molecule", "cell",
                "organism", "force", "energy", "motion", "light", "sound", "electricity",
                "gravity", "magnetism", "photosynthesis", "respiration", "digestion",
                "nervous system", "reproduction", "genetics", "evolution", "ecosystem",
                "periodic table", "element", "compound", "reaction", "acid", "base"
            ),
            "Current Affairs" to listOf(
                "current affairs", "recent", "award", "prize", "summit", "conference",
                "scheme", "launch", "appointment", "election", "ministry", "minister",
                "government scheme", "yojana", "mission"
            )
        )
    )

    private fun scoreMatches(text: String, keywords: List<String>): Pair<List<String>, Double> {
        val lowerText = text.lowercase()
        val words = lowerText.split("\\s+".toRegex()).toSet()

        val matches = keywords.filter { keyword ->
            val lowerKeyword = keyword.lowercase()
            when {
                lowerKeyword.contains(" ") -> lowerText.contains(lowerKeyword)
                else -> words.any { word ->
                    word == lowerKeyword ||
                    (word.contains(lowerKeyword) && lowerKeyword.length > 4) ||
                    (lowerKeyword.contains(word) && word.length > 4)
                }
            }
        }

        if (matches.isEmpty()) return Pair(emptyList(), 0.0)

        val boostedScore = matches.sumOf { keyword ->
            val boost = getKeywordBoostSafe(keyword)
            val lengthWeight = when {
                keyword.length >= 10 -> 3.0
                keyword.length >= 7 -> 2.0
                keyword.length >= 5 -> 1.5
                else -> 1.0
            }
            val multiWordBoost = if (keyword.contains(" ")) 2.0 else 1.0
            boost * lengthWeight * multiWordBoost
        }

        val confidence = boostedScore / keywords.size.toDouble()
        return Pair(matches, confidence)
    }

    fun classifyWithCandidates(text: String): ClassificationResultWithCandidates {
        return try {
            if (text.isBlank()) {
                val unknown = createUnknownResult(text)
                return ClassificationResultWithCandidates(unknown, emptyList())
            }

            val results = mutableListOf<ClassificationMatch>()

            subjectKeywords.forEach { (subject, topics) ->
                topics.forEach { (topic, keywords) ->
                    val (matches, baseConfidence) = scoreMatches(text, keywords)

                    if (matches.isNotEmpty()) {
                        val contextBoost = when {
                            subject == "General Awareness" && topic == "Geography" &&
                            (text.contains("country", ignoreCase = true) ||
                             text.contains("nation", ignoreCase = true) ||
                             text.contains("border", ignoreCase = true) ||
                             text.contains("largest", ignoreCase = true) ||
                             text.contains("smallest", ignoreCase = true) ||
                             text.contains("capital", ignoreCase = true)) -> 2.5
                            else -> 1.0
                        }

                        val confidence = baseConfidence * contextBoost
                        results.add(ClassificationMatch(subject, topic, confidence, matches))
                    }
                }
            }

            val sortedResults = results.sortedByDescending { it.confidence }
            val bestMatch = sortedResults.firstOrNull()

            if (bestMatch == null || bestMatch.confidence < 0.05) {
                val unknown = createUnknownResult(text)
                return ClassificationResultWithCandidates(unknown, emptyList())
            }

            val candidates = sortedResults.take(5).map { match ->
                ConfidenceEngine.ClassificationCandidate(
                    subject = match.subject,
                    topic = match.topic,
                    confidence = (match.confidence * 100).coerceAtMost(100.0),
                    matchedKeywords = match.matchedKeywords
                )
            }

            val primaryResult = ClassificationResult(
                subject = bestMatch.subject,
                topic = bestMatch.topic,
                confidence = (bestMatch.confidence * 100).coerceAtMost(100.0),
                matchedKeywords = bestMatch.matchedKeywords,
                cleanedText = text,
                status = ClassificationStatus.LOW_CONFIDENCE,
                needsLLM = true,
                source = ClassificationSource.RULE,
                id = null
            )

            ClassificationResultWithCandidates(primaryResult, candidates)

        } catch (e: Exception) {
            val error = createUnknownResult(text)
            ClassificationResultWithCandidates(error, emptyList())
        }
    }

    fun classify(text: String): ClassificationResult {
        return classifyWithCandidates(text).primaryResult
    }

    private fun createUnknownResult(cleanedText: String = ""): ClassificationResult {
        return ClassificationResult(
            subject = "Miscellaneous",
            topic = "General",
            confidence = 0.0,
            matchedKeywords = emptyList(),
            cleanedText = cleanedText,
            status = ClassificationStatus.LOW_CONFIDENCE,
            needsLLM = true,
            source = ClassificationSource.RULE,
            id = null
        )
    }

    fun getAvailableSubjects(): Set<String> = subjectKeywords.keys

    fun getTopicsForSubject(subject: String): Set<String> = subjectKeywords[subject]?.keys ?: emptySet()

    fun getKeywordsForTopic(subject: String, topic: String): List<String> =
        subjectKeywords[subject]?.get(topic) ?: emptyList()

    private data class ClassificationMatch(
        val subject: String,
        val topic: String,
        val confidence: Double,
        val matchedKeywords: List<String>
    )

    data class ClassificationResultWithCandidates(
        val primaryResult: ClassificationResult,
        val allCandidates: List<ConfidenceEngine.ClassificationCandidate>
    )

    private fun getKeywordBoostSafe(keyword: String): Double {
        return try {
            if (::mcqLearningService.isInitialized) mcqLearningService.getKeywordBoost(keyword) else 1.0
        } catch (e: Exception) {
            1.0
        }
    }
}
