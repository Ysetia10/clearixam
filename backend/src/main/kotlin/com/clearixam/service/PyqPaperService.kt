package com.clearixam.service

import com.clearixam.dto.request.SubmitAttemptRequest
import com.clearixam.dto.response.*
import com.clearixam.entity.QuestionPaper
import com.clearixam.entity.TestAttempt
import com.clearixam.repository.QuestionPaperRepository
import com.clearixam.repository.TestAttemptRepository
import com.clearixam.repository.UserRepository
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

@Service
class PyqPaperService(
    private val paperRepository: QuestionPaperRepository,
    private val attemptRepository: TestAttemptRepository,
    private val userRepository: UserRepository,
    private val objectMapper: ObjectMapper
) {
    private val iso = DateTimeFormatter.ISO_LOCAL_DATE_TIME

    @Transactional(readOnly = true)
    fun listPapers(userEmail: String, examId: UUID?): List<PaperSummaryResponse> {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")
        val papers = if (examId != null) {
            paperRepository.findByExamIdOrderByYearDescTitleAsc(examId)
        } else {
            paperRepository.findAllByOrderByYearDescTitleAsc()
        }
        return papers.map { paper ->
            val latest = attemptRepository
                .findByUserAndPaperAndStatusOrderBySubmittedAtDesc(user, paper, "SUBMITTED")
                .firstOrNull()
            toSummary(paper, latest)
        }
    }

    fun getPaperForTaking(paperId: UUID): PaperDetailResponse {
        val paper = paperRepository.findById(paperId)
            .orElseThrow { IllegalArgumentException("Paper not found: $paperId") }
        return toDetail(paper)
    }

    @Transactional
    fun startAttempt(userEmail: String, paperId: UUID): StartAttemptResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")
        val paper = paperRepository.findById(paperId)
            .orElseThrow { IllegalArgumentException("Paper not found: $paperId") }

        attemptRepository.deleteInProgressForPaper(user, paper)

        val attempt = attemptRepository.save(
            TestAttempt(
                user = user,
                paper = paper,
                status = "IN_PROGRESS"
            )
        )
        // If a parallel start raced in (e.g. React Strict Mode), keep only this one.
        attemptRepository.deleteOtherInProgress(user, paper, attempt.id!!)

        return StartAttemptResponse(
            attemptId = attempt.id!!,
            paper = toDetail(paper),
            startedAt = attempt.startedAt.format(iso),
            durationMinutes = paper.durationMinutes
        )
    }

    @Transactional
    fun submitAttempt(
        userEmail: String,
        attemptId: UUID,
        request: SubmitAttemptRequest
    ): AttemptResultResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")
        val attempt = attemptRepository.findByIdAndUser(attemptId, user)
            ?: throw IllegalArgumentException("Attempt not found: $attemptId")

        if (attempt.status == "SUBMITTED") {
            return toResult(attempt)
        }

        val paper = attempt.paper
        val root = objectMapper.readTree(paper.contentJson)
        val questions = root.path("questions")
        val correctMarks = paper.exam.correctMarks
        val negativeMarks = paper.exam.negativeMarks

        val answers = request.answers.mapKeys { it.key.trim() }
            .mapValues { it.value.trim() }
            .filterValues { it.isNotEmpty() }

        val scored = scoreQuestions(questions, answers, correctMarks, negativeMarks)

        val updated = attempt.copy(
            submittedAt = LocalDateTime.now(),
            answersJson = objectMapper.writeValueAsString(answers),
            sectionScoresJson = objectMapper.writeValueAsString(scored.sections),
            totalScore = scored.totalScore,
            correctCount = scored.totalCorrect,
            incorrectCount = scored.totalIncorrect,
            unattemptedCount = scored.totalUnattempted,
            status = "SUBMITTED"
        )
        val saved = attemptRepository.save(updated)

        // Keep only this latest submitted attempt for the paper
        attemptRepository.deleteAllExcept(user, paper, saved.id!!)

        return toResult(saved)
    }

    fun getAttempt(userEmail: String, attemptId: UUID): AttemptResultResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")
        val attempt = attemptRepository.findByIdAndUser(attemptId, user)
            ?: throw IllegalArgumentException("Attempt not found: $attemptId")
        if (attempt.status != "SUBMITTED") {
            throw IllegalStateException("Attempt is still in progress")
        }
        return toResult(attempt)
    }

    @Transactional(readOnly = true)
    fun getAnalysis(userEmail: String, attemptId: UUID): AttemptAnalysisResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")
        val attempt = attemptRepository.findByIdAndUser(attemptId, user)
            ?: throw IllegalArgumentException("Attempt not found: $attemptId")
        if (attempt.status != "SUBMITTED") {
            throw IllegalStateException("Attempt is still in progress")
        }

        val paper = attempt.paper
        val root = objectMapper.readTree(paper.contentJson)
        val questions = root.path("questions")
        val answers: Map<String, String> =
            if (!attempt.answersJson.isNullOrBlank()) objectMapper.readValue(attempt.answersJson)
            else emptyMap()

        val scored = scoreQuestions(
            questions,
            answers,
            paper.exam.correctMarks,
            paper.exam.negativeMarks
        )

        return AttemptAnalysisResponse(
            attemptId = attempt.id!!,
            paperId = paper.id!!,
            paperTitle = paper.title,
            examName = paper.exam.name,
            submittedAt = attempt.submittedAt?.format(iso),
            totalScore = attempt.totalScore ?: scored.totalScore,
            correctCount = attempt.correctCount ?: scored.totalCorrect,
            incorrectCount = attempt.incorrectCount ?: scored.totalIncorrect,
            unattemptedCount = attempt.unattemptedCount ?: scored.totalUnattempted,
            questionCount = paper.questionCount,
            topicsTagged = scored.topicsTagged,
            sections = scored.sectionAnalysis,
            questions = scored.questionReviews
        )
    }

    @Transactional(readOnly = true)
    fun listRecentAttempts(
        userEmail: String,
        examId: UUID?,
        limit: Int = 10
    ): List<RecentPyqAttemptResponse> {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")
        val capped = limit.coerceIn(1, 50)
        return attemptRepository.findByUserOrderByStartedAtDesc(user)
            .asSequence()
            .filter { it.status == "SUBMITTED" }
            .filter { examId == null || it.paper.exam.id == examId }
            .sortedByDescending { it.submittedAt ?: it.startedAt }
            .take(capped)
            .map { attempt ->
                val sections: List<SectionScoreResponse> =
                    if (!attempt.sectionScoresJson.isNullOrBlank()) {
                        objectMapper.readValue(attempt.sectionScoresJson)
                    } else emptyList()
                RecentPyqAttemptResponse(
                    attemptId = attempt.id!!,
                    paperId = attempt.paper.id!!,
                    paperTitle = attempt.paper.title,
                    examId = attempt.paper.exam.id!!,
                    examName = attempt.paper.exam.name,
                    year = attempt.paper.year,
                    slot = attempt.paper.slot,
                    submittedAt = attempt.submittedAt?.format(iso),
                    totalScore = attempt.totalScore ?: 0.0,
                    correctCount = attempt.correctCount ?: 0,
                    incorrectCount = attempt.incorrectCount ?: 0,
                    unattemptedCount = attempt.unattemptedCount ?: 0,
                    questionCount = attempt.paper.questionCount,
                    sections = sections
                )
            }
            .toList()
    }

    @Transactional(readOnly = true)
    fun getTopicPerformance(userEmail: String, examId: UUID?): PyqTopicPerformanceResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")

        data class TopicAcc(
            var correct: Int = 0,
            var incorrect: Int = 0,
            var unattempted: Int = 0,
            var total: Int = 0,
            var section: String = "",
            var sectionCode: String = "",
            val paperIds: MutableSet<UUID> = mutableSetOf()
        )

        val buckets = linkedMapOf<String, TopicAcc>()
        var topicsTagged = false
        var attemptCount = 0

        val attempts = attemptRepository.findByUserOrderByStartedAtDesc(user)
            .filter { it.status == "SUBMITTED" }
            .filter { examId == null || it.paper.exam.id == examId }

        for (attempt in attempts) {
            attemptCount += 1
            val paper = attempt.paper
            val root = objectMapper.readTree(paper.contentJson)
            val questions = root.path("questions")
            val answers: Map<String, String> =
                if (!attempt.answersJson.isNullOrBlank()) objectMapper.readValue(attempt.answersJson)
                else emptyMap()
            val scored = scoreQuestions(
                questions,
                answers,
                paper.exam.correctMarks,
                paper.exam.negativeMarks
            )
            if (scored.topicsTagged) topicsTagged = true

            for (section in scored.sectionAnalysis) {
                for (topic in section.topics) {
                    val key = "${section.sectionCode}||${topic.topic}"
                    val acc = buckets.getOrPut(key) {
                        TopicAcc(section = section.section, sectionCode = section.sectionCode)
                    }
                    acc.correct += topic.correct
                    acc.incorrect += topic.incorrect
                    acc.unattempted += topic.unattempted
                    acc.total += topic.total
                    paper.id?.let { acc.paperIds.add(it) }
                }
            }
        }

        val topics = buckets.map { (key, acc) ->
            val topicName = key.substringAfter("||")
            val attempted = acc.correct + acc.incorrect
            PyqTopicPerformanceItem(
                subject = acc.section.ifBlank { acc.sectionCode },
                sectionCode = acc.sectionCode,
                topic = topicName,
                correct = acc.correct,
                incorrect = acc.incorrect,
                unattempted = acc.unattempted,
                total = acc.total,
                accuracy = if (attempted > 0) (acc.correct.toDouble() / attempted) * 100.0 else 0.0,
                attemptCount = acc.paperIds.size
            )
        }.sortedWith(
            compareBy<PyqTopicPerformanceItem> { it.accuracy }
                .thenByDescending { it.total }
                .thenBy { it.subject }
                .thenBy { it.topic }
        )

        return PyqTopicPerformanceResponse(
            topicsTagged = topicsTagged,
            attemptCount = attemptCount,
            topics = topics
        )
    }

    private data class Acc(
        var total: Int = 0,
        var attempted: Int = 0,
        var correct: Int = 0,
        var incorrect: Int = 0,
        var unattempted: Int = 0,
        var score: Double = 0.0,
        var section: String = ""
    )

    private data class ScoredPaper(
        val totalScore: Double,
        val totalCorrect: Int,
        val totalIncorrect: Int,
        val totalUnattempted: Int,
        val sections: List<SectionScoreResponse>,
        val sectionAnalysis: List<SectionAnalysisResponse>,
        val questionReviews: List<QuestionReviewResponse>,
        val topicsTagged: Boolean
    )

    private fun scoreQuestions(
        questions: JsonNode,
        answers: Map<String, String>,
        correctMarks: Double,
        negativeMarks: Double
    ): ScoredPaper {
        val bySection = linkedMapOf<String, Acc>()
        val bySectionTopic = linkedMapOf<String, LinkedHashMap<String, Acc>>()
        val questionReviews = mutableListOf<QuestionReviewResponse>()
        var totalCorrect = 0
        var totalIncorrect = 0
        var totalUnattempted = 0
        var topicsTagged = false

        questions.forEach { q ->
            val qNo = q.path("qNo").asInt()
            val code = q.path("sectionCode").asText("UNK")
            val sectionName = q.path("section").asText(code)
            val type = q.path("type").asText("MCQ")
            val stem = q.path("stem").asText("")
            val correctAnswer = q.path("correctAnswer").asText("").trim()
            val rawTopic = q.path("topic").asText("").trim()
            if (rawTopic.isNotEmpty()) topicsTagged = true
            val topic = rawTopic.ifEmpty { "Uncategorized" }
            val userAns = answers[qNo.toString()]?.trim().orEmpty()
            val options = if (q.path("options").isObject) {
                q.path("options").fields().asSequence().associate { it.key to it.value.asText() }
            } else null

            val secAcc = bySection.getOrPut(code) { Acc(section = sectionName) }
            val topicMap = bySectionTopic.getOrPut(code) { linkedMapOf() }
            val topicAcc = topicMap.getOrPut(topic) { Acc(section = sectionName) }
            secAcc.total += 1
            topicAcc.total += 1

            val status: String
            val scoreDelta: Double
            if (userAns.isEmpty()) {
                secAcc.unattempted += 1
                topicAcc.unattempted += 1
                totalUnattempted += 1
                status = "UNATTEMPTED"
                scoreDelta = 0.0
            } else {
                secAcc.attempted += 1
                topicAcc.attempted += 1
                val isCorrect = answersMatch(type, userAns, correctAnswer)
                if (isCorrect) {
                    secAcc.correct += 1
                    topicAcc.correct += 1
                    secAcc.score += correctMarks
                    topicAcc.score += correctMarks
                    totalCorrect += 1
                    status = "CORRECT"
                    scoreDelta = correctMarks
                } else {
                    secAcc.incorrect += 1
                    topicAcc.incorrect += 1
                    secAcc.score -= negativeMarks
                    topicAcc.score -= negativeMarks
                    totalIncorrect += 1
                    status = "INCORRECT"
                    scoreDelta = -negativeMarks
                }
            }

            questionReviews.add(
                QuestionReviewResponse(
                    qNo = qNo,
                    sectionCode = code,
                    section = sectionName,
                    topic = rawTopic.ifEmpty { null },
                    type = type,
                    stem = stem,
                    options = options,
                    status = status,
                    userAnswer = userAns.ifEmpty { null },
                    correctAnswer = correctAnswer,
                    scoreDelta = scoreDelta
                )
            )
        }

        val sections = bySection.map { (code, acc) ->
            SectionScoreResponse(
                sectionCode = code,
                section = acc.section,
                total = acc.total,
                attempted = acc.attempted,
                correct = acc.correct,
                incorrect = acc.incorrect,
                unattempted = acc.unattempted,
                score = acc.score
            )
        }

        val sectionAnalysis = bySection.map { (code, acc) ->
            val topics = (bySectionTopic[code] ?: emptyMap()).map { (topic, tAcc) ->
                TopicScoreResponse(
                    topic = topic,
                    total = tAcc.total,
                    attempted = tAcc.attempted,
                    correct = tAcc.correct,
                    incorrect = tAcc.incorrect,
                    unattempted = tAcc.unattempted,
                    score = tAcc.score
                )
            }
            SectionAnalysisResponse(
                sectionCode = code,
                section = acc.section,
                total = acc.total,
                attempted = acc.attempted,
                correct = acc.correct,
                incorrect = acc.incorrect,
                unattempted = acc.unattempted,
                score = acc.score,
                topics = topics
            )
        }

        return ScoredPaper(
            totalScore = totalCorrect * correctMarks - totalIncorrect * negativeMarks,
            totalCorrect = totalCorrect,
            totalIncorrect = totalIncorrect,
            totalUnattempted = totalUnattempted,
            sections = sections,
            sectionAnalysis = sectionAnalysis,
            questionReviews = questionReviews,
            topicsTagged = topicsTagged
        )
    }

    private fun answersMatch(type: String, userAns: String, correctAnswer: String): Boolean {
        if (type.equals("TITA", ignoreCase = true)) {
            val normalize = { s: String ->
                s.trim().lowercase().replace(",", "").replace(" ", "")
            }
            return normalize(userAns) == normalize(correctAnswer)
        }
        return userAns.trim() == correctAnswer.trim()
    }

    private fun toSummary(paper: QuestionPaper, latest: TestAttempt?) = PaperSummaryResponse(
        id = paper.id!!,
        slug = paper.slug,
        title = paper.title,
        examId = paper.exam.id!!,
        examName = paper.exam.name,
        year = paper.year,
        slot = paper.slot,
        durationMinutes = paper.durationMinutes,
        questionCount = paper.questionCount,
        latestAttempt = latest?.let {
            LatestAttemptSummary(
                attemptId = it.id!!,
                totalScore = it.totalScore ?: 0.0,
                correctCount = it.correctCount ?: 0,
                incorrectCount = it.incorrectCount ?: 0,
                unattemptedCount = it.unattemptedCount ?: 0,
                submittedAt = it.submittedAt?.format(iso)
            )
        }
    )

    private fun toDetail(paper: QuestionPaper): PaperDetailResponse {
        val root = objectMapper.readTree(paper.contentJson)
        val markingNode = root.path("marking")
        val questions = root.path("questions").map { q ->
            PaperQuestionResponse(
                qNo = q.path("qNo").asInt(),
                section = q.path("section").asText(),
                sectionCode = q.path("sectionCode").asText(),
                type = q.path("type").asText(),
                stem = q.path("stem").asText(),
                options = if (q.path("options").isObject) {
                    q.path("options").fields().asSequence().associate { it.key to it.value.asText() }
                } else null,
                stimulus = q.path("stimulus").takeIf { !it.isNull && !it.isMissingNode }?.asText(),
                setRange = if (q.path("setRange").isArray) {
                    q.path("setRange").map { it.asInt() }
                } else null,
                images = rewriteImages(q.path("images")),
                chartDependent = q.path("chartDependent").asBoolean(false),
                topic = q.path("topic").takeIf { !it.isNull && !it.isMissingNode && it.asText().isNotBlank() }?.asText()
            )
        }

        return PaperDetailResponse(
            id = paper.id!!,
            slug = paper.slug,
            title = paper.title,
            examName = paper.exam.name,
            year = paper.year,
            slot = paper.slot,
            durationMinutes = paper.durationMinutes,
            questionCount = paper.questionCount,
            marking = MarkingResponse(
                correct = markingNode.path("correct").asDouble(paper.exam.correctMarks),
                incorrect = markingNode.path("incorrect").asDouble(paper.exam.negativeMarks),
                unattempted = markingNode.path("unattempted").asDouble(0.0)
            ),
            questions = questions
        )
    }

    private fun rewriteImages(node: JsonNode): List<String>? {
        if (!node.isArray || node.isEmpty) return null
        return node.map { img ->
            val raw = img.asText()
            when {
                raw.startsWith("http") || raw.startsWith("/") -> raw
                raw.startsWith("assets/") -> "/pyq/$raw"
                else -> "/pyq/assets/$raw"
            }
        }
    }

    private fun toResult(attempt: TestAttempt): AttemptResultResponse {
        val sections: List<SectionScoreResponse> =
            if (!attempt.sectionScoresJson.isNullOrBlank()) {
                objectMapper.readValue(attempt.sectionScoresJson)
            } else emptyList()
        val answers: Map<String, String> =
            if (!attempt.answersJson.isNullOrBlank()) {
                objectMapper.readValue(attempt.answersJson)
            } else emptyMap()

        return AttemptResultResponse(
            attemptId = attempt.id!!,
            paperId = attempt.paper.id!!,
            paperTitle = attempt.paper.title,
            status = attempt.status,
            startedAt = attempt.startedAt.format(iso),
            submittedAt = attempt.submittedAt?.format(iso),
            totalScore = attempt.totalScore ?: 0.0,
            correctCount = attempt.correctCount ?: 0,
            incorrectCount = attempt.incorrectCount ?: 0,
            unattemptedCount = attempt.unattemptedCount ?: 0,
            questionCount = attempt.paper.questionCount,
            sections = sections,
            answers = answers
        )
    }
}
