-- =============================================================================
-- CleariXam Production Database Migration
-- =============================================================================
-- Run this script on your Render PostgreSQL database once.
-- It is IDEMPOTENT — safe to run multiple times.
-- 
-- What this fixes:
--   - Creates missing tables: exams, subjects, subject_performance
--   - Migrates subject_scores (drops old enum column, adds FK to subjects)
--   - Adds missing columns to mock_tests (exam_id, test_name, etc.)
--   - Adds active_exam_id to users
--   - Seeds default exam and subject data
-- =============================================================================

BEGIN;

-- --------------------------------------------------------
-- STEP 1: Create the exams table (new table)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id          UUID        NOT NULL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    max_marks   INTEGER     NOT NULL,
    max_questions INTEGER   NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- STEP 2: Seed default exams (idempotent via ON CONFLICT)
-- --------------------------------------------------------
INSERT INTO exams (id, name, description, max_marks, max_questions, created_at)
VALUES
    (gen_random_uuid(), 'UPSC', 'Union Public Service Commission', 200, 100, NOW()),
    (gen_random_uuid(), 'SSC',  'Staff Selection Commission',       200, 200, NOW()),
    (gen_random_uuid(), 'CAT',  'Common Admission Test',            300, 66,  NOW())
ON CONFLICT (name) DO NOTHING;

-- --------------------------------------------------------
-- STEP 3: Create the subjects table (new table)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id         UUID         NOT NULL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    exam_id    UUID         NOT NULL REFERENCES exams(id),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (name, exam_id)
);

-- --------------------------------------------------------
-- STEP 4: Seed default subjects for each exam
-- --------------------------------------------------------
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Polity',         e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'History',        e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Geography',      e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Economy',        e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Environment',    e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Science',        e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Current Affairs',e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'CSAT',           e.id, NOW() FROM exams e WHERE e.name = 'UPSC' ON CONFLICT (name, exam_id) DO NOTHING;

INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Quantitative Aptitude', e.id, NOW() FROM exams e WHERE e.name = 'SSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Reasoning',             e.id, NOW() FROM exams e WHERE e.name = 'SSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'English',               e.id, NOW() FROM exams e WHERE e.name = 'SSC' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'General Awareness',     e.id, NOW() FROM exams e WHERE e.name = 'SSC' ON CONFLICT (name, exam_id) DO NOTHING;

INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Quantitative Ability',                          e.id, NOW() FROM exams e WHERE e.name = 'CAT' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Verbal Ability and Reading Comprehension',      e.id, NOW() FROM exams e WHERE e.name = 'CAT' ON CONFLICT (name, exam_id) DO NOTHING;
INSERT INTO subjects (id, name, exam_id, created_at)
SELECT gen_random_uuid(), 'Data Interpretation and Logical Reasoning',     e.id, NOW() FROM exams e WHERE e.name = 'CAT' ON CONFLICT (name, exam_id) DO NOTHING;

-- --------------------------------------------------------
-- STEP 5: Fix users table — add active_exam_id if missing
-- --------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'active_exam_id'
    ) THEN
        ALTER TABLE users ADD COLUMN active_exam_id UUID REFERENCES exams(id);
    END IF;
END $$;

-- --------------------------------------------------------
-- STEP 6: Fix mock_tests table — add new NOT NULL columns
--         (existing rows get placeholder defaults)
-- --------------------------------------------------------

-- Add exam_id column (nullable first, then backfill, then make NOT NULL)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'exam_id'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN exam_id UUID;
        -- Backfill old rows with UPSC as default (adjust if needed)
        UPDATE mock_tests SET exam_id = (SELECT id FROM exams WHERE name = 'UPSC' LIMIT 1)
        WHERE exam_id IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN exam_id SET NOT NULL;
        ALTER TABLE mock_tests ADD CONSTRAINT fk_mock_tests_exam FOREIGN KEY (exam_id) REFERENCES exams(id);
    END IF;
END $$;

-- Add test_name column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'test_name'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN test_name VARCHAR(255);
        UPDATE mock_tests SET test_name = 'Migrated Test' WHERE test_name IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN test_name SET NOT NULL;
    END IF;
END $$;

-- Add total_questions column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'total_questions'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN total_questions INTEGER;
        UPDATE mock_tests SET total_questions = 100 WHERE total_questions IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN total_questions SET NOT NULL;
    END IF;
END $$;

-- Add attempted column (if missing — may already exist via old schema)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'attempted'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN attempted INTEGER;
        UPDATE mock_tests SET attempted = 0 WHERE attempted IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN attempted SET NOT NULL;
    END IF;
END $$;

-- Add correct column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'correct'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN correct INTEGER;
        UPDATE mock_tests SET correct = 0 WHERE correct IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN correct SET NOT NULL;
    END IF;
END $$;

-- Add incorrect column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'incorrect'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN incorrect INTEGER;
        UPDATE mock_tests SET incorrect = 0 WHERE incorrect IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN incorrect SET NOT NULL;
    END IF;
END $$;

-- Add marks_obtained column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'marks_obtained'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN marks_obtained DOUBLE PRECISION;
        UPDATE mock_tests SET marks_obtained = COALESCE(total_score, 0) WHERE marks_obtained IS NULL;
        ALTER TABLE mock_tests ALTER COLUMN marks_obtained SET NOT NULL;
    END IF;
END $$;

-- Add time_taken column (nullable — no default needed)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mock_tests' AND column_name = 'time_taken'
    ) THEN
        ALTER TABLE mock_tests ADD COLUMN time_taken INTEGER;
    END IF;
END $$;

-- --------------------------------------------------------
-- STEP 7: Fix subject_scores table
--         Drop old enum column, add subject_id FK
-- --------------------------------------------------------

-- Add subject_id column pointing to subjects table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subject_scores' AND column_name = 'subject_id'
    ) THEN
        ALTER TABLE subject_scores ADD COLUMN subject_id UUID;

        -- Migrate old rows: map enum subject_name → subject UUID from subjects table
        -- Handles UPSC subjects (old enum values were: POLITY, HISTORY, GEOGRAPHY, ECONOMY, ENVIRONMENT, SCIENCE)
        UPDATE subject_scores ss
        SET subject_id = s.id
        FROM subjects s
        JOIN exams e ON s.exam_id = e.id
        WHERE e.name = 'UPSC'
          AND ss.subject_id IS NULL
          AND UPPER(s.name) = UPPER(
              CASE ss.subject_name
                  WHEN 'POLITY'      THEN 'Polity'
                  WHEN 'HISTORY'     THEN 'History'
                  WHEN 'GEOGRAPHY'   THEN 'Geography'
                  WHEN 'ECONOMY'     THEN 'Economy'
                  WHEN 'ENVIRONMENT' THEN 'Environment'
                  WHEN 'SCIENCE'     THEN 'Science'
                  ELSE NULL
              END
          );

        -- Any remaining unmapped rows: assign the first UPSC subject as placeholder
        UPDATE subject_scores
        SET subject_id = (
            SELECT s.id FROM subjects s JOIN exams e ON s.exam_id = e.id
            WHERE e.name = 'UPSC' ORDER BY s.created_at LIMIT 1
        )
        WHERE subject_id IS NULL;

        ALTER TABLE subject_scores ALTER COLUMN subject_id SET NOT NULL;
        ALTER TABLE subject_scores ADD CONSTRAINT fk_subject_scores_subject FOREIGN KEY (subject_id) REFERENCES subjects(id);
    END IF;
END $$;

-- Drop old subject_name column (only after subject_id is safely set)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subject_scores' AND column_name = 'subject_name'
    ) THEN
        ALTER TABLE subject_scores DROP COLUMN subject_name;
    END IF;
END $$;

-- --------------------------------------------------------
-- STEP 8: Create subject_performance table (new table)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subject_performance (
    id                  UUID             NOT NULL PRIMARY KEY,
    user_id             UUID             NOT NULL REFERENCES users(id),
    exam_id             UUID             NOT NULL REFERENCES exams(id),
    subject_id          UUID             NOT NULL REFERENCES subjects(id),
    marks               DOUBLE PRECISION NOT NULL,
    questions_attempted INTEGER          NOT NULL,
    correct             INTEGER          NOT NULL,
    incorrect           INTEGER          NOT NULL,
    test_date           DATE             NOT NULL,
    created_at          TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- STEP 9: Verification
-- --------------------------------------------------------
DO $$
DECLARE
    exam_count    INT;
    subject_count INT;
BEGIN
    SELECT COUNT(*) INTO exam_count    FROM exams;
    SELECT COUNT(*) INTO subject_count FROM subjects;
    RAISE NOTICE 'Migration complete. Exams: %, Subjects: %', exam_count, subject_count;
END $$;

COMMIT;
