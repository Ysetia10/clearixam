package com.clearixam.enums

enum class AllowedSubject(val displayName: String) {
    QUANT("Quantitative Aptitude"),
    REASONING("Reasoning"),
    ENGLISH("English"),
    GS("General Awareness");

    companion object {
        fun fromString(subject: String): AllowedSubject? {
            val normalized = subject.trim().lowercase()
            return values().find {
                it.displayName.equals(subject, ignoreCase = true) ||
                it.name.equals(subject, ignoreCase = true) ||
                normalized.contains(it.displayName.lowercase()) ||
                it.displayName.lowercase().contains(normalized)
            } ?: when {
                normalized.contains("general") || normalized.contains("awareness") ||
                normalized.contains("knowledge") || normalized.contains("gs") -> GS
                normalized.contains("quant") || normalized.contains("math") ||
                normalized.contains("aptitude") -> QUANT
                normalized.contains("reason") -> REASONING
                normalized.contains("english") || normalized.contains("language") -> ENGLISH
                else -> null
            }
        }

        fun getAllowedSubjects(): List<String> = values().map { it.displayName }
    }
}

enum class ClassificationStatus {
    CONFIDENT,
    LOW_CONFIDENCE,
    AMBIGUOUS,
    LLM_ENHANCED,
    FALLBACK_RULE,
    FALLBACK_RULE_INVALID_LLM
}

enum class ClassificationSource {
    RULE,
    LLM
}