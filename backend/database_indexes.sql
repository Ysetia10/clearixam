-- Performance Optimization Indexes for CleariXam
-- Run this script manually on your PostgreSQL database
-- These indexes are non-destructive and will improve query performance

-- Index on mock_test.user_id for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_mock_test_user_id ON mock_test(user_id);

-- Index on mock_test.test_date for date-based sorting and filtering
CREATE INDEX IF NOT EXISTS idx_mock_test_test_date ON mock_test(test_date);

-- Composite index for user + test_date queries
CREATE INDEX IF NOT EXISTS idx_mock_test_user_test_date ON mock_test(user_id, test_date DESC);

-- Index on subject_score.subject_name for subject-wise analytics
CREATE INDEX IF NOT EXISTS idx_subject_score_subject_name ON subject_score(subject_name);

-- Index on subject_score.mock_test_id for joining with mock tests
CREATE INDEX IF NOT EXISTS idx_subject_score_mock_test_id ON subject_score(mock_test_id);

-- Index on goals.user_id for user-specific goal queries
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Index on goals.target_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    schemaname = 'public'
    AND tablename IN ('mock_test', 'subject_score', 'goals')
ORDER BY 
    tablename, indexname;
