-- MCQ Learning System Migration
-- Creates table for storing MCQ classifications and user corrections

CREATE TABLE IF NOT EXISTS mcq_classifications (
    id BIGSERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    subtopic VARCHAR(100),
    source VARCHAR(10) NOT NULL CHECK (source IN ('RULE', 'LLM')),
    confidence DOUBLE PRECISION NOT NULL,
    matched_keywords TEXT, -- JSON array as string
    user_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    corrected_subject VARCHAR(100),
    corrected_topic VARCHAR(100),
    corrected_subtopic VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    corrected_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcq_classifications_user_corrected ON mcq_classifications(user_corrected);
CREATE INDEX IF NOT EXISTS idx_mcq_classifications_created_at ON mcq_classifications(created_at);
CREATE INDEX IF NOT EXISTS idx_mcq_classifications_question_text ON mcq_classifications USING hash(question_text);
CREATE INDEX IF NOT EXISTS idx_mcq_classifications_subject ON mcq_classifications(subject);
CREATE INDEX IF NOT EXISTS idx_mcq_classifications_corrected_subject ON mcq_classifications(corrected_subject);

-- Comments
COMMENT ON TABLE mcq_classifications IS 'Stores MCQ classification results and user corrections for learning';
COMMENT ON COLUMN mcq_classifications.question_text IS 'Cleaned question text used for classification';
COMMENT ON COLUMN mcq_classifications.source IS 'Classification source: RULE or LLM';
COMMENT ON COLUMN mcq_classifications.matched_keywords IS 'JSON array of keywords that matched during classification';
COMMENT ON COLUMN mcq_classifications.user_corrected IS 'Whether user has corrected this classification';
COMMENT ON COLUMN mcq_classifications.corrected_at IS 'When the correction was applied';