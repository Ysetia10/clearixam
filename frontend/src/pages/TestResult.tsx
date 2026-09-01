import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AttemptResult, papersApi } from '../api/papers';

export const TestResult = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const stateResult = (location.state as { result?: AttemptResult } | null)?.result;

  const [result, setResult] = useState<AttemptResult | null>(stateResult ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result || !attemptId) return;
    papersApi
      .getAttempt(attemptId)
      .then(setResult)
      .catch((e) => setError((e as Error).message));
  }, [attemptId, result]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="card" style={{ padding: 20, color: '#f43f5e' }}>{error}</div>
      </DashboardLayout>
    );
  }

  if (!result) {
    return (
      <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="page-title" style={{ marginBottom: 8 }}>Test result</h1>
      <p style={{ color: 'var(--text3)', marginBottom: 24, fontSize: 14 }}>
        {result.paperTitle}
      </p>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Total score', value: result.totalScore.toFixed(1) },
          { label: 'Correct', value: String(result.correctCount) },
          { label: 'Incorrect', value: String(result.incorrectCount) },
          { label: 'Unattempted', value: String(result.unattemptedCount) },
        ].map((card) => (
          <div key={card.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              {['Section', 'Attempted', 'Correct', 'Incorrect', 'Unattempted', 'Score'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', color: 'var(--text3)', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.sections.map((s) => (
              <tr key={s.sectionCode} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.sectionCode}</td>
                <td style={{ padding: '12px 16px' }}>{s.attempted}/{s.total}</td>
                <td style={{ padding: '12px 16px' }}>{s.correct}</td>
                <td style={{ padding: '12px 16px' }}>{s.incorrect}</td>
                <td style={{ padding: '12px 16px' }}>{s.unattempted}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{s.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/pyq-analyze/${result.attemptId}`)}>
          Analyze
        </button>
        <button className="btn" onClick={() => navigate(`/take-test/${result.paperId}`)}>
          Reattempt
        </button>
        <button className="btn" onClick={() => navigate('/pyq-tests')}>
          Back to PYQ tests
        </button>
      </div>
    </DashboardLayout>
  );
};

export default TestResult;
