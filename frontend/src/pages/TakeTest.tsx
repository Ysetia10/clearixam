import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { papersApi, PaperDetail, PaperQuestion } from '../api/papers';
import { useToast } from '../components/Toast';

function formatTime(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const TakeTest = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showStimulus, setShowStimulus] = useState(true);
  const autoSubmitted = useRef(false);
  const answersRef = useRef(answers);
  const startGeneration = useRef(0);
  answersRef.current = answers;

  useEffect(() => {
    if (!paperId) return;
    const generation = ++startGeneration.current;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const started = await papersApi.startAttempt(paperId);
        if (cancelled || generation !== startGeneration.current) return;
        setAttemptId(started.attemptId);
        setPaper(started.paper);
        setSecondsLeft(started.durationMinutes * 60);
        setIndex(0);
        setAnswers({});
        autoSubmitted.current = false;
      } catch (e) {
        if (cancelled || generation !== startGeneration.current) return;
        showToast((e as Error).message || 'Failed to start test', 'error');
        navigate('/pyq-tests');
      } finally {
        if (!cancelled && generation === startGeneration.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paperId, navigate, showToast]);

  const submit = useCallback(async () => {
    if (!attemptId || submitting || autoSubmitted.current) return;
    autoSubmitted.current = true;
    setSubmitting(true);
    try {
      const result = await papersApi.submitAttempt(attemptId, answersRef.current);
      navigate(`/test-result/${result.attemptId}`, { replace: true, state: { result } });
    } catch (e) {
      autoSubmitted.current = false;
      showToast((e as Error).message || 'Submit failed', 'error');
      setSubmitting(false);
    }
  }, [attemptId, navigate, showToast, submitting]);

  useEffect(() => {
    if (!paper || loading || secondsLeft == null) return;
    const t = window.setInterval(() => {
      setSecondsLeft((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [paper, loading, secondsLeft == null]);

  useEffect(() => {
    if (!paper || loading || secondsLeft !== 0) return;
    void submit();
  }, [secondsLeft, paper, loading, submit]);

  const question: PaperQuestion | undefined = paper?.questions[index];
  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v.trim().length > 0).length,
    [answers]
  );

  if (loading || !paper || !question) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const setAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [String(question.qNo)]: value }));
  };

  const currentAnswer = answers[String(question.qNo)] ?? '';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{paper.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Q{question.qNo}/{paper.questionCount} · {question.sectionCode} · {question.type}
            {' · '}
            Answered {answeredCount}/{paper.questionCount}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 800,
              fontSize: 18,
              color: (secondsLeft ?? 0) <= 300 ? '#f43f5e' : 'var(--accent)',
            }}
          >
            {formatTime(secondsLeft ?? 0)}
          </div>
          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={() => {
              if (window.confirm('Submit the test? You cannot change answers after this.')) {
                void submit();
              }
            }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 220px',
          gap: 0,
          flex: 1,
          minHeight: 0,
        }}
        className="take-test-grid"
      >
        <main style={{ padding: 16, overflow: 'auto', maxWidth: 900, width: '100%', margin: '0 auto' }}>
          {question.stimulus && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowStimulus((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  marginBottom: showStimulus ? 12 : 0,
                }}
              >
                {showStimulus ? 'Hide passage / set' : 'Show passage / set'}
                {question.setRange ? ` (Q${question.setRange[0]}–${question.setRange[1]})` : ''}
              </button>
              {showStimulus && (
                <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {question.stimulus}
                </div>
              )}
            </div>
          )}

          {question.images?.map((src) => (
            <div key={src} className="card" style={{ padding: 12, marginBottom: 16 }}>
              <img
                src={src}
                alt="Question figure"
                style={{
                  maxWidth: '100%',
                  display: 'block',
                  borderRadius: 8,
                }}
              />
            </div>
          ))}

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
              Question {question.qNo}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.65, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
              {question.stem}
            </div>

            {question.type === 'MCQ' && question.options ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['1', '2', '3', '4'] as const).map((key) => {
                  const text = question.options?.[key];
                  if (!text) return null;
                  const selected = currentAnswer === key;
                  return (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        background: selected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${question.qNo}`}
                        checked={selected}
                        onChange={() => setAnswer(key)}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <strong>({key})</strong> {text}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                  Type-in answer (TITA)
                </div>
                <input
                  className="input"
                  value={currentAnswer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  style={{ width: '100%', maxWidth: 360 }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
              <button
                className="btn"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </button>
              <button
                className="btn"
                style={{ color: 'var(--text3)' }}
                onClick={() => {
                  setAnswers((prev) => {
                    const next = { ...prev };
                    delete next[String(question.qNo)];
                    return next;
                  });
                }}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                disabled={index >= paper.questions.length - 1}
                onClick={() => setIndex((i) => Math.min(paper.questions.length - 1, i + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </main>

        <aside
          style={{
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 12,
            overflow: 'auto',
            maxHeight: 'calc(100vh - 64px)',
            position: 'sticky',
            top: 64,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text3)' }}>
            Question palette
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {paper.questions.map((q, i) => {
              const answered = Boolean(answers[String(q.qNo)]?.trim());
              const active = i === index;
              return (
                <button
                  key={q.qNo}
                  type="button"
                  onClick={() => setIndex(i)}
                  style={{
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: answered ? 'color-mix(in srgb, var(--green) 25%, transparent)' : 'transparent',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {q.qNo}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .take-test-grid {
            grid-template-columns: 1fr !important;
          }
          .take-test-grid aside {
            position: static !important;
            max-height: none !important;
            border-left: none !important;
            border-top: 1px solid var(--border);
          }
        }
      `}</style>
    </div>
  );
};

export default TakeTest;
