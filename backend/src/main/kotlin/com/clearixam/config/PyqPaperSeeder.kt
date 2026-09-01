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

    @Transactional
    override fun run(vararg args: String?) {
        seedCat2025Slot1()
    }

    private fun seedCat2025Slot1() {
        val slug = "cat-2025-slot-1"
        if (paperRepository.findBySlug(slug) != null) {
            return
        }

        val exam = examRepository.findByName("CAT")
        if (exam == null) {
            log.warn("CAT exam not found; skip PYQ paper seed")
            return
        }

        val resource = ClassPathResource("pyq/CAT-2025-Slot-01.json")
        if (!resource.exists()) {
            log.warn("Classpath pyq/CAT-2025-Slot-01.json missing; skip PYQ seed")
            return
        }

        val json = resource.inputStream.bufferedReader().use { it.readText() }
        val root = objectMapper.readTree(json)
        val questionCount = root.path("questions").size()

        paperRepository.save(
            QuestionPaper(
                exam = exam,
                slug = slug,
                title = root.path("title").asText("CAT 2025 Slot 1"),
                year = root.path("year").asInt(2025),
                slot = root.path("slot").asText("1"),
                durationMinutes = root.path("durationMinutes").asInt(120),
                questionCount = questionCount,
                contentJson = json
            )
        )
        log.info("Seeded PYQ paper {}", slug)
    }
}
