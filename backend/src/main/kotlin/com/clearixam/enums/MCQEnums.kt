package com.clearixam.enums

enum class AllowedSubject(val displayName: String) {
    QUANT("Quantitative Aptitude"),
    REASONING("Reasoning"),
    ENGLISH("English"),
    GS("General Knowledge");
    
    companion object {
        fun fromString(subject: String): AllowedSubject? {
            return values().find { 
                it.displayName.equals(subject, ignoreCase = true) ||
                it.name.equals(subject, ignoreCase = true)
            }
        }
        
        fun getAllowedSubjects(): List<String> {
            return values().map { it.displayName }
        }
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