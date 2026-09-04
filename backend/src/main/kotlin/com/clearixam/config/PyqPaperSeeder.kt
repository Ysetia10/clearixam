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
        "cat-2024-slot-1" to "pyq/CAT-2024-Slot-01.json",
        "cat-2025-slot-1" to "pyq/CAT-2025-Slot-01.json",
        "cat-2025-slot-2" to "pyq/CAT-2025-Slot-02.json",
        "cat-2025-slot-3" to "pyq/CAT-2025-Slot-03.json",
        "ssc-cgl-2025-slot-1" to "pyq/SSC-CGL-2025-Slot-01.json",
        "ssc-cgl-2025-slot-2" to "pyq/SSC-CGL-2025-Slot-02.json",
        "ssc-cgl-2025-slot-3" to "pyq/SSC-CGL-2025-Slot-03.json",
    )

    @Transactional
    override fun run(vararg args: String?) {
        for ((slug, resourcePath) in papers) {
            seedPaper(slug, resourcePath)
        }
    }

    private fun seedPaper(slug: String, resourcePath: String) {
        val resource = ClassPathResource(resourcePath)
        if (!resource.exists()) {
            log.warn("Classpath {} missing; skip PYQ seed", resourcePath)
            return
        }

        val json = resource.inputStream.bufferedReader().use { it.readText() }
        val root = objectMapper.readTree(json)
        val examName = root.path("exam").asText("CAT")
        val exam = examRepository.findByName(examName)
        if (exam == null) {
            log.warn("{} exam not found; skip PYQ paper seed for {}", examName, slug)
            return
        }

        val questionCount = root.path("questions").size()
        val slot = root.path("slot").asText(slug.substringAfterLast("-"))
        val defaultTitle = "$examName ${root.path("year").asInt(2025)} Slot $slot"
        val title = root.path("title").asText(defaultTitle)
        val durationMinutes = root.path("durationMinutes").asInt(
            if (examName.equals("SSC", ignoreCase = true)) 60 else 120
        )
        val year = root.path("year").asInt(2025)

        val existing = paperRepository.findBySlug(slug)
        if (existing != null) {
            if (
                existing.contentJson == json &&
                existing.questionCount == questionCount &&
                existing.durationMinutes == durationMinutes &&
                existing.title == title
            ) {
                return
            }
            paperRepository.save(
                existing.copy(
                    exam = exam,
                    title = title,
                    year = year,
                    slot = slot,
                    durationMinutes = durationMinutes,
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
                year = year,
                slot = slot,
                durationMinutes = durationMinutes,
                questionCount = questionCount,
                contentJson = json
            )
        )
        log.info("Seeded PYQ paper {}", slug)
    }
}
