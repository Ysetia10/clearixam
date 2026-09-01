package com.clearixam.config

import com.clearixam.entity.QuestionPaper
import com.clearixam.repository.ExamRepository
import com.clearixam.repository.QuestionPaperRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.core.annotation.Order
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Order(2)
class PyqPaperSeeder(
    private val examRepository: ExamRepository,
    private val paperRepository: QuestionPaperRepository,
    private val objectMapper: ObjectMapper
) : CommandLineRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    private val papers = listOf(
        "cat-2025-slot-1" to "pyq/CAT-2025-Slot-01.json",
        "cat-2025-slot-2" to "pyq/CAT-2025-Slot-02.json",
        "cat-2025-slot-3" to "pyq/CAT-2025-Slot-03.json",
    )

    @Transactional
    override fun run(vararg args: String?) {
        for ((slug, resourcePath) in papers) {
            seedPaper(slug, resourcePath)
        }
    }

    private fun seedPaper(slug: String, resourcePath: String) {
        val exam = examRepository.findByName("CAT")
        if (exam == null) {
            log.warn("CAT exam not found; skip PYQ paper seed for {}", slug)
            return
        }

        val resource = ClassPathResource(resourcePath)
        if (!resource.exists()) {
            log.warn("Classpath {} missing; skip PYQ seed", resourcePath)
            return
        }

        val json = resource.inputStream.bufferedReader().use { it.readText() }
        val root = objectMapper.readTree(json)
        val questionCount = root.path("questions").size()
        val slot = root.path("slot").asText(slug.substringAfterLast("-"))
        val title = root.path("title").asText("CAT 2025 Slot $slot")

        val existing = paperRepository.findBySlug(slug)
        if (existing != null) {
            if (existing.contentJson == json && existing.questionCount == questionCount) {
                return
            }
            paperRepository.save(
                existing.copy(
                    title = title,
                    questionCount = questionCount,
                    contentJson = json
                )
            )
            log.info("Updated PYQ paper {} ({} questions)", slug, questionCount)
            return
        }

        paperRepository.save(
            QuestionPaper(
                exam = exam,
                slug = slug,
                title = title,
                year = root.path("year").asInt(2025),
                slot = slot,
                durationMinutes = root.path("durationMinutes").asInt(120),
                questionCount = questionCount,
                contentJson = json
            )
        )
        log.info("Seeded PYQ paper {}", slug)
    }
}
