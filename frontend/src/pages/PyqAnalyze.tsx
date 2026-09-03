import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AttemptAnalysis, QuestionReview, papersApi } from '../api/papers';
import { PyqText, MathText, stripOptionNumberPrefix } from '../utils/formatPyqText';

type ReviewFilter = 'ALL' | 'INCORRECT' | 'CORRECT' | 'UNATTEMPTED';

function statusColor(status: string) {
  if (status === 'CORRECT') return 'var(--green)';
  if (status === 'INCORRECT') return 'var(--red)';
  return 'var(--text3)';
}

function statusLabel(status: string) {
  if (status === 'CORRECT') return 'Correct';
  if (status === 'INCORRECT') return 'Incorrect';
  return 'Unattempted';
}

function formatAnswer(q: QuestionReview, value: string | null | undefined) {
  if (!value) return '—';
  if (q.type === 'MCQ' && q.options?.[value]) {
    return <MathText text={stripOptionNumberPrefix(value, q.options[value])} />;
  }
  return <MathText text={value} />;
}

function QuestionCard({ q }: { q: QuestionReview }) {
  const [open, setOpen] = useState(q.status === 'INCORRECT');

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `3px solid ${statusColor(q.status)}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Q{q.qNo} · {q.sectionCode}
            {q.topic ? ` · ${q.topic}` : ''} · {q.type}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text2)',
              lineHeight: 1.45,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: open ? undefined : 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            <MathText text={q.stem} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: statusColor(q.status), fontSize: 13 }}>
            {statusLabel(q.status)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: q.scoreDelta > 0 ? 'var(--green)' : q.scoreDelta < 0 ? 'var(--red)' : 'var(--text3)',
              marginTop: 4,
            }}
          >
            {q.scoreDelta > 0 ? '+' : ''}
            {q.scoreDelta.toFixed(1)}
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12, marginBottom: 14 }}>
            <PyqText text={q.stem} jumble />
          </div>

          {q.type === 'MCQ' && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {(['1', '2', '3', '4'] as const).map((key) => {
                const text = q.options?.[key];
                if (!text) return null;
                const isCorrect = q.correctAnswer === key;
                const isYours = q.userAnswer === key;
                return (
                  <div
                    key={key}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${
                        isCorrect ? 'var(--green)' : isYours ? 'var(--red)' : 'var(--border)'
                      }`,
                      background: isCorrect
                        ? 'var(--green-glow)'
                        : isYours
                          ? 'var(--red-glow)'
                          : 'transparent',
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    <MathText text={stripOptionNumberPrefix(key, text)} />
                    {isCorrect && (
                      <span style={{ marginLeft: 8, color: 'var(--green)', fontWeight: 600 }}>Correct</span>
                    )}
                    {isYours && !isCorrect && (
                      <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 600 }}>Your answer</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {q.type !== 'MCQ' && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 8, fontSize: 14 }}>
              <div>
                <span style={{ color: 'var(--text3)' }}>Your answer: </span>
                <strong style={{ color: statusColor(q.status) }}>{formatAnswer(q, q.userAnswer)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text3)' }}>Correct answer: </span>
                <strong style={{ color: 'var(--green)' }}>{formatAnswer(q, q.correctAnswer)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const PyqAnalyze = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AttemptAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>('INCORRECT');

  useEffect(() => {
    if (!attemptId) return;
    papersApi
      .getAnalysis(attemptId)
      .then(setAnalysis)
      .catch((e) => setError((e as Error).message));
  }, [attemptId]);

  const questions = analysis?.questions ?? [];

  const filtered = useMemo(() => {
    if (filter === 'ALL') return questions;
    return questions.filter((q) => q.status === filter);
  }, [questions, filter]);

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

  const filters: { key: ReviewFilter; label: string; count: number }[] = [
    { key: 'INCORRECT', label: 'Incorrect', count: analysis.incorrectCount },
    { key: 'CORRECT', label: 'Correct', count: analysis.correctCount },
    { key: 'UNATTEMPTED', label: 'Unattempted', count: analysis.unattemptedCount },
    { key: 'ALL', label: 'All', count: analysis.questionCount },
  ];

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

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Question review</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className="btn"
              onClick={() => setFilter(f.key)}
              style={{
                borderColor: filter === f.key ? 'var(--accent)' : undefined,
                background:
                  filter === f.key ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : undefined,
                fontWeight: filter === f.key ? 700 : 500,
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 16, color: 'var(--text3)', fontSize: 14 }}>
            No questions in this filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((q) => (
              <QuestionCard key={q.qNo} q={q} />
            ))}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Section & topic breakdown</h2>
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
