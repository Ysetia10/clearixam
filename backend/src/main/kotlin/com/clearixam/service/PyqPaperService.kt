package com.clearixam.service

import com.clearixam.dto.request.SubmitAttemptRequest
import com.clearixam.dto.response.*
import com.clearixam.entity.QuestionPaper
import com.clearixam.entity.TestAttempt
import com.clearixam.repository.PaperListRow
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
            paperRepository.findListRowsByExamId(examId)
        } else {
            paperRepository.findAllListRows()
        }
        // One query for all submitted attempts; keep latest per paper.
        val latestByPaperId = attemptRepository
            .findByUserAndStatusOrderBySubmittedAtDesc(user, "SUBMITTED")
            .groupBy { it.paper.id!! }
            .mapValues { (_, attempts) -> attempts.first() }

        return papers.map { paper ->
            toSummary(paper, latestByPaperId[paper.id])
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

        val secondsSpent = request.secondsSpent
            .mapKeys { it.key.trim() }
            .mapValues { (_, v) -> v.coerceAtLeast(0) }
            .filterKeys { it.isNotEmpty() }

        val scored = scoreQuestions(questions, answers, correctMarks, negativeMarks, secondsSpent)

        val updated = attempt.copy(
            submittedAt = LocalDateTime.now(),
            answersJson = objectMapper.writeValueAsString(answers),
            sectionScoresJson = objectMapper.writeValueAsString(scored.sections),
            secondsSpentJson = objectMapper.writeValueAsString(secondsSpent),
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
        val secondsSpent = parseSecondsSpent(attempt.secondsSpentJson)

        val scored = scoreQuestions(
            questions,
            answers,
            paper.exam.correctMarks,
            paper.exam.negativeMarks,
            secondsSpent
        )

        val timedSeconds = scored.questionReviews.mapNotNull { it.secondsSpent }
        val totalSeconds = timedSeconds.sum().takeIf { timedSeconds.isNotEmpty() }
        val avgSeconds =
            if (timedSeconds.isNotEmpty()) timedSeconds.average() else null

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
            questions = scored.questionReviews,
            totalSecondsSpent = totalSeconds,
            avgSecondsPerQuestion = avgSeconds
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
            val paperIds: MutableSet<UUID> = mutableSetOf(),
            var timedSeconds: Long = 0,
            var timedCount: Int = 0,
            var expectedSecondsSum: Double = 0.0
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
            val secondsSpent = parseSecondsSpent(attempt.secondsSpentJson)
            val scored = scoreQuestions(
                questions,
                answers,
                paper.exam.correctMarks,
                paper.exam.negativeMarks,
                secondsSpent
            )
            if (scored.topicsTagged) topicsTagged = true
            val expectedBySection = expectedSecondsBySection(paper, root)

            for (review in scored.questionReviews) {
                val topicName = review.topic?.takeIf { it.isNotBlank() } ?: "Uncategorized"
                val key = "${review.sectionCode}||$topicName"
                val acc = buckets.getOrPut(key) {
                    TopicAcc(section = review.section, sectionCode = review.sectionCode)
                }
                when (review.status) {
                    "CORRECT" -> acc.correct += 1
                    "INCORRECT" -> acc.incorrect += 1
                    else -> acc.unattempted += 1
                }
                acc.total += 1
                paper.id?.let { acc.paperIds.add(it) }
                val secs = review.secondsSpent
                if (secs != null && secs >= 0) {
                    acc.timedSeconds += secs
                    acc.timedCount += 1
                    val expected = expectedBySection[review.sectionCode]
                        ?: expectedBySection.values.firstOrNull()
                        ?: 90.0
                    acc.expectedSecondsSum += expected
                }
            }
        }

        val topics = buckets.map { (key, acc) ->
            val topicName = key.substringAfter("||")
            val missed = acc.incorrect + acc.unattempted
            val accuracy =
                if (acc.total > 0) (acc.correct.toDouble() / acc.total) * 100.0 else 0.0
            val avgSeconds =
                if (acc.timedCount > 0) acc.timedSeconds.toDouble() / acc.timedCount else null
            val expected =
                if (acc.timedCount > 0) acc.expectedSecondsSum / acc.timedCount else null
            val paceRatio =
                if (avgSeconds != null && expected != null && expected > 0) avgSeconds / expected
                else null
            val speedLabel = speedLabelFor(paceRatio, acc.timedCount)
            PyqTopicPerformanceItem(
                subject = acc.section.ifBlank { acc.sectionCode },
                sectionCode = acc.sectionCode,
                topic = topicName,
                correct = acc.correct,
                incorrect = acc.incorrect,
                unattempted = acc.unattempted,
                total = acc.total,
                accuracy = accuracy,
                attemptCount = acc.paperIds.size,
                missed = missed,
                avgSecondsSpent = avgSeconds,
                expectedSeconds = expected,
                paceRatio = paceRatio,
                speedLabel = speedLabel,
                insight = topicInsight(accuracy, speedLabel)
            )
        }.sortedWith(
            compareBy<PyqTopicPerformanceItem> { it.accuracy }
                .thenByDescending { it.missed }
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

    @Transactional(readOnly = true)
    fun getTopicQuestions(
        userEmail: String,
        examId: UUID?,
        sectionCode: String,
        topic: String
    ): TopicQuestionsResponse {
        val user = userRepository.findByEmail(userEmail)
            ?: throw IllegalArgumentException("User not found: $userEmail")

        val wantedTopic = topic.ifBlank { "Uncategorized" }
        val wantedSection = sectionCode.trim()
        val out = mutableListOf<TopicQuestionReviewResponse>()

        val attempts = attemptRepository.findByUserOrderByStartedAtDesc(user)
            .filter { it.status == "SUBMITTED" }
            .filter { examId == null || it.paper.exam.id == examId }

        for (attempt in attempts) {
            val paper = attempt.paper
            val root = objectMapper.readTree(paper.contentJson)
            val questions = root.path("questions")
            val answers: Map<String, String> =
                if (!attempt.answersJson.isNullOrBlank()) objectMapper.readValue(attempt.answersJson)
                else emptyMap()
            val secondsSpent = parseSecondsSpent(attempt.secondsSpentJson)
            val scored = scoreQuestions(
                questions,
                answers,
                paper.exam.correctMarks,
                paper.exam.negativeMarks,
                secondsSpent
            )
            for (review in scored.questionReviews) {
                val reviewTopic = review.topic?.takeIf { it.isNotBlank() } ?: "Uncategorized"
                if (review.sectionCode != wantedSection) continue
                if (reviewTopic != wantedTopic) continue
                out.add(
                    TopicQuestionReviewResponse(
                        attemptId = attempt.id!!,
                        paperId = paper.id!!,
                        paperTitle = paper.title,
                        qNo = review.qNo,
                        sectionCode = review.sectionCode,
                        section = review.section,
                        topic = review.topic,
                        type = review.type,
                        stem = review.stem,
                        options = review.options,
                        status = review.status,
                        userAnswer = review.userAnswer,
                        correctAnswer = review.correctAnswer,
                        scoreDelta = review.scoreDelta,
                        submittedAt = attempt.submittedAt?.format(iso),
                        secondsSpent = review.secondsSpent
                    )
                )
            }
        }

        out.sortWith(
            compareBy<TopicQuestionReviewResponse> { it.status != "INCORRECT" }
                .thenBy { it.status != "UNATTEMPTED" }
                .thenByDescending { it.submittedAt ?: "" }
                .thenBy { it.qNo }
        )

        return TopicQuestionsResponse(
            sectionCode = wantedSection,
            topic = wantedTopic,
            questions = out
        )
    }

    private data class Acc(
        var total: Int = 0,
        var attempted: Int = 0,
        var correct: Int = 0,
        var incorrect: Int = 0,
        var unattempted: Int = 0,
        var score: Double = 0.0,
        var section: String = "",
        var timeSeconds: Long = 0,
        var timedCount: Int = 0
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

    private fun parseSecondsSpent(json: String?): Map<String, Int> {
        if (json.isNullOrBlank()) return emptyMap()
        return try {
            objectMapper.readValue<Map<String, Int>>(json)
                .mapKeys { it.key.trim() }
                .mapValues { (_, v) -> v.coerceAtLeast(0) }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    /** Expected seconds/question by section from paper timer settings. */
    private fun expectedSecondsBySection(paper: QuestionPaper, root: JsonNode): Map<String, Double> {
        val timingMode = root.path("timingMode").asText("full")
        val questions = root.path("questions")
        val counts = linkedMapOf<String, Int>()
        questions.forEach { q ->
            val code = q.path("sectionCode").asText("UNK")
            counts[code] = (counts[code] ?: 0) + 1
        }
        if (counts.isEmpty()) {
            val fallback = paper.durationMinutes * 60.0 / paper.questionCount.coerceAtLeast(1)
            return mapOf("UNK" to fallback)
        }

        if (timingMode == "sectional") {
            val sectionMinsDefault = root.path("sectionDurationMinutes").asInt(15)
            val sectionsNode = root.path("sections")
            val durationByCode = linkedMapOf<String, Int>()
            if (sectionsNode.isArray) {
                sectionsNode.forEach { s ->
                    val code = s.path("code").asText("")
                    if (code.isNotBlank()) {
                        durationByCode[code] = s.path("durationMinutes").asInt(sectionMinsDefault)
                    }
                }
            }
            return counts.mapValues { (code, count) ->
                val mins = durationByCode[code] ?: sectionMinsDefault
                mins * 60.0 / count.coerceAtLeast(1)
            }
        }

        val perQ = paper.durationMinutes * 60.0 / paper.questionCount.coerceAtLeast(1)
        return counts.mapValues { perQ }
    }

    private fun speedLabelFor(paceRatio: Double?, timedCount: Int): String? {
        if (paceRatio == null || timedCount < 2) return null
        return when {
            paceRatio >= 1.25 -> "SLOW"
            paceRatio <= 0.7 -> "FAST"
            else -> "OK"
        }
    }

    private fun topicInsight(accuracy: Double, speedLabel: String?): String? {
        val weak = accuracy < 60.0
        val strong = accuracy >= 80.0
        return when {
            weak && speedLabel == "SLOW" ->
                "Weak and slow — strengthen concepts, then work on pace"
            strong && speedLabel == "SLOW" ->
                "Strong but slow — practice timed sets to increase speed"
            weak && speedLabel == "FAST" ->
                "Weak and rushed — slow down and avoid careless errors"
            strong && speedLabel == "FAST" ->
                "Strong and fast — keep this pace"
            weak && speedLabel == "OK" ->
                "Weak — needs more practice"
            strong && speedLabel == "OK" ->
                "Strong — solid accuracy at a healthy pace"
            speedLabel == "SLOW" ->
                "Takes longer than the exam pace — try to speed up"
            speedLabel == "FAST" ->
                "Faster than the exam pace — watch accuracy"
            else -> null
        }
    }

    private fun avgSecondsOrNull(acc: Acc): Double? =
        if (acc.timedCount > 0) acc.timeSeconds.toDouble() / acc.timedCount else null

    private fun scoreQuestions(
        questions: JsonNode,
        answers: Map<String, String>,
        correctMarks: Double,
        negativeMarks: Double,
        secondsSpent: Map<String, Int> = emptyMap()
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
            val qSeconds = secondsSpent[qNo.toString()]

            val secAcc = bySection.getOrPut(code) { Acc(section = sectionName) }
            val topicMap = bySectionTopic.getOrPut(code) { linkedMapOf() }
            val topicAcc = topicMap.getOrPut(topic) { Acc(section = sectionName) }
            secAcc.total += 1
            topicAcc.total += 1
            if (qSeconds != null) {
                secAcc.timeSeconds += qSeconds
                secAcc.timedCount += 1
                topicAcc.timeSeconds += qSeconds
                topicAcc.timedCount += 1
            }

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
                    scoreDelta = scoreDelta,
                    secondsSpent = qSeconds
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
                    score = tAcc.score,
                    avgSecondsSpent = avgSecondsOrNull(tAcc)
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
                topics = topics,
                avgSecondsSpent = avgSecondsOrNull(acc)
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

    private fun toSummary(paper: PaperListRow, latest: TestAttempt?) = PaperSummaryResponse(
        id = paper.id,
        slug = paper.slug,
        title = paper.title,
        examId = paper.examId,
        examName = paper.examName,
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

        val sectionsNode = root.path("sections")
        val sections = if (sectionsNode.isArray) {
            sectionsNode.map { s ->
                PaperSectionMetaResponse(
                    code = s.path("code").asText(),
                    name = s.path("name").asText(),
                    qFrom = s.path("qFrom").asInt(),
                    qTo = s.path("qTo").asInt(),
                    durationMinutes = s.path("durationMinutes").asInt(
                        root.path("sectionDurationMinutes").asInt(15)
                    )
                )
            }
        } else emptyList()

        val timingMode = root.path("timingMode").asText("full")
        val sectionDuration = root.path("sectionDurationMinutes").takeIf { !it.isMissingNode && !it.isNull }
            ?.asInt()
            ?: sections.firstOrNull()?.durationMinutes
        val calculator = when {
            root.path("calculator").isBoolean -> root.path("calculator").asBoolean()
            paper.exam.name.equals("SSC", ignoreCase = true) -> false
            else -> true
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
            questions = questions,
            timingMode = timingMode,
            sectionDurationMinutes = sectionDuration,
            calculator = calculator,
            sections = sections
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
