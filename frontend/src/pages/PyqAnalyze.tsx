import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AttemptAnalysis, papersApi } from '../api/papers';

export const PyqAnalyze = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AttemptAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    papersApi
      .getAnalysis(attemptId)
      .then(setAnalysis)
      .catch((e) => setError((e as Error).message));
  }, [attemptId]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="card" style={{ padding: 20, color: '#f43f5e' }}>
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!analysis) {
    return (
      <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <DashboardLayout>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Analyze
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 14, margin: 0 }}>
            {analysis.paperTitle} · {analysis.examName}
            {analysis.submittedAt
              ? ` · ${new Date(analysis.submittedAt).toLocaleString('en-IN')}`
              : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => navigate('/pyq-tests')}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/take-test/${analysis.paperId}`)}
          >
            Reattempt
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Total score', value: analysis.totalScore.toFixed(1) },
          { label: 'Correct', value: String(analysis.correctCount) },
          { label: 'Incorrect', value: String(analysis.incorrectCount) },
          { label: 'Unattempted', value: String(analysis.unattemptedCount) },
        ].map((card) => (
          <div key={card.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {!analysis.topicsTagged && (
        <div
          className="card"
          style={{
            padding: 14,
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--text3)',
          }}
        >
          Topic tags are not on this paper yet — breakdown shows sections, with topics as
          Uncategorized until we classify questions.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {analysis.sections.map((section) => (
          <div key={section.sectionCode} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{section.sectionCode}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{section.section}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                {section.correct}C / {section.incorrect}I / {section.unattempted}U ·{' '}
                <strong style={{ color: 'var(--accent)' }}>{section.score.toFixed(1)}</strong>
              </div>
            </div>

            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    {['Topic', 'Attempted', 'Correct', 'Incorrect', 'Unattempted', 'Score'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 16px',
                            color: 'var(--text3)',
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {section.topics.map((topic) => (
                    <tr key={topic.topic} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{topic.topic}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {topic.attempted}/{topic.total}
                      </td>
                      <td style={{ padding: '10px 16px' }}>{topic.correct}</td>
                      <td style={{ padding: '10px 16px' }}>{topic.incorrect}</td>
                      <td style={{ padding: '10px 16px' }}>{topic.unattempted}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                        {topic.score.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default PyqAnalyze;
