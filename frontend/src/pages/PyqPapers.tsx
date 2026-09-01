import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress, Box } from '@mui/material';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { papersApi } from '../api/papers';
import { examsApi, Exam } from '../api/exams';

export const PyqPapers = () => {
  const navigate = useNavigate();
  const [selectedExamId, setSelectedExamId] = useState('');

  const { data: exams = [] } = useQuery({
    queryKey: ['exams-ordered'],
    queryFn: examsApi.getAllOrdered,
  });

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      const cat = exams.find((e: Exam) => e.name === 'CAT');
      setSelectedExamId(cat?.id || exams[0].id);
    }
  }, [exams, selectedExamId]);

  const { data: papers, isLoading, error } = useQuery({
    queryKey: ['papers', selectedExamId],
    queryFn: () => papersApi.list(selectedExamId || undefined),
    enabled: !!selectedExamId,
  });

  const selectedExam = exams.find((e: Exam) => e.id === selectedExamId);

  return (
    <DashboardLayout>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            PYQ Tests
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 14, margin: 0 }}>
            Timed full papers. Latest attempt is kept for analysis.
          </p>
        </div>
        {exams.length > 0 && (
          <select
            className="select"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            style={{ minWidth: 140 }}
          >
            {exams.map((exam: Exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {error && (
        <div className="card" style={{ padding: 20, color: 'var(--red, #f43f5e)' }}>
          {(error as Error).message || 'Failed to load papers'}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {papers?.map((paper) => {
          const latest = paper.latestAttempt;
          return (
            <div
              key={paper.id}
              className="card"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{paper.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                  {paper.examName} · {paper.questionCount} questions · {paper.durationMinutes} min
                </div>
                {selectedExam && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    Marking +{selectedExam.correctMarks} / −{selectedExam.negativeMarks} · single timer
                  </div>
                )}
                {latest && (
                  <div style={{ fontSize: 13, marginTop: 10, color: 'var(--text2)' }}>
                    Latest score:{' '}
                    <strong style={{ color: 'var(--accent)' }}>{latest.totalScore.toFixed(1)}</strong>
                    {' · '}
                    {latest.correctCount}C / {latest.incorrectCount}I / {latest.unattemptedCount}U
                  </div>
                )}
              </div>

              {latest ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/take-test/${paper.id}`)}
                  >
                    Reattempt
                  </button>
                  <button
                    className="btn"
                    onClick={() => navigate(`/pyq-analyze/${latest.attemptId}`)}
                  >
                    Analyze
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/take-test/${paper.id}`)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Start test
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!isLoading && papers && papers.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--text3)' }}>
          No PYQ papers for {selectedExam?.name || 'this exam'} yet.
        </div>
      )}
    </DashboardLayout>
  );
};

export default PyqPapers;
