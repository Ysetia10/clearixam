import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { papersApi, PaperDetail, PaperQuestion } from '../api/papers';
import { useToast } from '../components/Toast';
import {
  SECTION_ORDER,
  SectionCode,
  countByStatus,
  getQuestionStatus,
  paletteStyle,
} from '../utils/pyqTestState';

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

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text2)' }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: color,
          border: border || '1px solid var(--border)',
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}

function InstructionsModal({
  paper,
  onBegin,
}: {
  paper: PaperDetail;
  onBegin: () => void;
}) {
  const m = paper.marking;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{paper.title}</h2>
        <p style={{ margin: '0 0 16px', color: 'var(--text3)', fontSize: 14 }}>
          {paper.questionCount} questions · {paper.durationMinutes} minutes · single timer for all sections
        </p>
        <ul style={{ margin: '0 0 20px', paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
          <li>
            Marking: <strong>+{m.correct}</strong> correct, <strong>−{m.incorrect}</strong> incorrect,{' '}
            <strong>{m.unattempted}</strong> unattempted
          </li>
          <li>Use the question palette to jump between questions (VARC → DILR → QA).</li>
          <li>
            <strong>Mark for Review</strong> flags a question to revisit; you can mark with or without an answer.
          </li>
          <li>
            <strong>Save &amp; Next</strong> moves on; <strong>Clear Response</strong> removes your answer for the
            current question.
          </li>
          <li>The timer starts when you click Begin Test.</li>
        </ul>
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onBegin}>
          Begin Test
        </button>
      </div>
    </div>
  );
}

function SubmitModal({
  paper,
  counts,
  markedCount,
  onCancel,
  onConfirm,
  submitting,
}: {
  paper: PaperDetail;
  counts: ReturnType<typeof countByStatus>;
  markedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const pending = counts.notAnswered + counts.notVisited + counts.marked;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Submit test?</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text3)' }}>
          You cannot change answers after submission.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16, fontSize: 14 }}>
          {[
            { label: 'Answered', value: counts.answered + counts.answeredMarked, color: 'var(--green)' },
            { label: 'Not answered (visited)', value: counts.notAnswered, color: 'var(--red)' },
            { label: 'Not visited', value: counts.notVisited, color: 'var(--text3)' },
            { label: 'Marked for review', value: markedCount, color: '#a855f7' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text2)' }}>{row.label}</span>
              <strong style={{ color: row.color }}>{row.value}</strong>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border)',
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span>Total questions</span>
            <strong>{paper.questionCount}</strong>
          </div>
        </div>
        {pending > 0 && (
          <p style={{ fontSize: 13, color: 'var(--amber)', margin: '0 0 16px' }}>
            {pending} question{pending === 1 ? '' : 's'} still unanswered or only marked for review.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" style={{ flex: 1 }} disabled={submitting} onClick={onCancel}>
            Continue test
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={onConfirm}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const TakeTest = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
  const [marked, setMarked] = useState<Set<number>>(() => new Set());
  const [index, setIndex] = useState(0);
  const [paletteSection, setPaletteSection] = useState<SectionCode>('VARC');
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
        setVisited(new Set([started.paper.questions[0]?.qNo].filter(Boolean) as number[]));
        setMarked(new Set());
        setPaletteSection(started.paper.questions[0]?.sectionCode as SectionCode || 'VARC');
        setTestStarted(false);
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
      setShowSubmitModal(false);
    }
  }, [attemptId, navigate, showToast, submitting]);

  useEffect(() => {
    if (!paper || loading || !testStarted || secondsLeft == null) return;
    const t = window.setInterval(() => {
      setSecondsLeft((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [paper, loading, testStarted, secondsLeft == null]);

  useEffect(() => {
    if (!paper || loading || !testStarted || secondsLeft !== 0) return;
    void submit();
  }, [secondsLeft, paper, loading, testStarted, submit]);

  const question: PaperQuestion | undefined = paper?.questions[index];

  const questionNos = useMemo(
    () => (paper?.questions || []).map((q) => q.qNo),
    [paper]
  );

  const counts = useMemo(
    () => countByStatus(questionNos, visited, marked, answers),
    [questionNos, visited, marked, answers]
  );

  const markedCount = counts.marked + counts.answeredMarked;

  const paletteQuestions = useMemo(() => {
    if (!paper) return [];
    return paper.questions.filter((q) => q.sectionCode === paletteSection);
  }, [paper, paletteSection]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (!paper) return;
      const clamped = Math.max(0, Math.min(paper.questions.length - 1, nextIndex));
      const q = paper.questions[clamped];
      setIndex(clamped);
      setVisited((prev) => new Set(prev).add(q.qNo));
      setPaletteSection(q.sectionCode as SectionCode);
    },
    [paper]
  );

  const goToQuestion = useCallback(
    (qNo: number) => {
      if (!paper) return;
      const i = paper.questions.findIndex((q) => q.qNo === qNo);
      if (i >= 0) goToIndex(i);
    },
    [paper, goToIndex]
  );

  const toggleMarkCurrent = useCallback(() => {
    if (!question) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(question.qNo)) next.delete(question.qNo);
      else next.add(question.qNo);
      return next;
    });
  }, [question]);

  const clearResponse = useCallback(() => {
    if (!question) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[String(question.qNo)];
      return next;
    });
  }, [question]);

  const saveAndNext = useCallback(() => {
    if (!paper) return;
    if (index < paper.questions.length - 1) goToIndex(index + 1);
  }, [paper, index, goToIndex]);

  const markAndNext = useCallback(() => {
    if (!question || !paper) return;
    setMarked((prev) => new Set(prev).add(question.qNo));
    if (index < paper.questions.length - 1) goToIndex(index + 1);
  }, [question, paper, index, goToIndex]);

  const jumpToSection = useCallback(
    (section: SectionCode) => {
      if (!paper) return;
      setPaletteSection(section);
      const first = paper.questions.find((q) => q.sectionCode === section);
      if (first) goToQuestion(first.qNo);
    },
    [paper, goToQuestion]
  );

  useEffect(() => {
    if (!paper || !testStarted || !question) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToIndex(index - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        saveAndNext();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMarkCurrent();
      } else if (question.type === 'MCQ' && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        setAnswers((prev) => ({ ...prev, [String(question.qNo)]: e.key }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paper, testStarted, question, index, goToIndex, saveAndNext, toggleMarkCurrent]);

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
  const isMarked = marked.has(question.qNo);
  const currentStatus = getQuestionStatus(question.qNo, visited, marked, answers);

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
      {!testStarted && <InstructionsModal paper={paper} onBegin={() => setTestStarted(true)} />}
      {showSubmitModal && (
        <SubmitModal
          paper={paper}
          counts={counts}
          markedCount={markedCount}
          submitting={submitting}
          onCancel={() => setShowSubmitModal(false)}
          onConfirm={() => void submit()}
        />
      )}

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
            {question.section} · Q{question.qNo}/{paper.questionCount} · {question.type}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Answered {counts.answered + counts.answeredMarked}/{paper.questionCount}
            {markedCount > 0 && <> · Marked {markedCount}</>}
          </div>
          <div
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 800,
              fontSize: 18,
              color: testStarted && (secondsLeft ?? 0) <= 300 ? '#f43f5e' : 'var(--accent)',
              minWidth: 64,
              textAlign: 'right',
            }}
          >
            {testStarted ? formatTime(secondsLeft ?? 0) : formatTime(paper.durationMinutes * 60)}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!testStarted || submitting}
            onClick={() => setShowSubmitModal(true)}
          >
            Submit Test
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 240px',
          gap: 0,
          flex: 1,
          minHeight: 0,
        }}
        className="take-test-grid"
      >
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <main style={{ padding: 16, overflow: 'auto', flex: 1, maxWidth: 920, width: '100%', margin: '0 auto' }}>
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
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{question.stimulus}</div>
                )}
              </div>
            )}

            {question.images?.map((src) => (
              <div key={src} className="card" style={{ padding: 12, marginBottom: 16 }}>
                <img
                  src={src}
                  alt="Question figure"
                  style={{ maxWidth: '100%', display: 'block', borderRadius: 8 }}
                />
              </div>
            ))}

            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Question {question.qNo}</div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: isMarked ? '#a855f7' : 'var(--text2)',
                    fontWeight: isMarked ? 600 : 400,
                  }}
                >
                  <input type="checkbox" checked={isMarked} onChange={toggleMarkCurrent} />
                  Mark for review
                </label>
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
                          background: selected
                            ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                            : 'transparent',
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
            </div>
          </main>

          <footer
            style={{
              position: 'sticky',
              bottom: 0,
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            <button type="button" className="btn" disabled={index === 0} onClick={() => goToIndex(index - 1)}>
              ← Previous
            </button>
            <button type="button" className="btn" onClick={markAndNext} disabled={index >= paper.questions.length - 1}>
              Mark for Review &amp; Next →
            </button>
            <button type="button" className="btn" onClick={clearResponse}>
              Clear Response
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveAndNext}
              disabled={index >= paper.questions.length - 1}
            >
              Save &amp; Next →
            </button>
          </footer>
        </div>

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
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {SECTION_ORDER.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => jumpToSection(sec)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: 11,
                  fontWeight: paletteSection === sec ? 700 : 500,
                  borderRadius: 8,
                  border: `1px solid ${paletteSection === sec ? 'var(--accent)' : 'var(--border)'}`,
                  background: paletteSection === sec ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {sec}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text3)' }}>
            Question palette
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 14 }}>
            {paletteQuestions.map((q) => {
              const i = paper.questions.findIndex((x) => x.qNo === q.qNo);
              const status = getQuestionStatus(q.qNo, visited, marked, answers);
              const active = i === index;
              return (
                <button
                  key={q.qNo}
                  type="button"
                  title={`Q${q.qNo} — ${status.replace(/-/g, ' ')}`}
                  onClick={() => goToQuestion(q.qNo)}
                  style={paletteStyle(status, active)}
                >
                  {q.qNo}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <LegendItem color="var(--surface2)" label="Not visited" />
            <LegendItem color="var(--red-glow)" border="2px solid var(--red)" label="Not answered" />
            <LegendItem color="var(--green-glow)" border="2px solid var(--green)" label="Answered" />
            <LegendItem color="rgba(168,85,247,0.18)" border="2px solid #a855f7" label="Marked for review" />
            <LegendItem
              color="var(--green-glow)"
              border="2px solid #a855f7"
              label="Answered & marked"
            />
          </div>

          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
            Keys: ← → navigate · M mark · 1–4 select MCQ
          </div>
          {currentStatus !== 'not-visited' && (
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text2)' }}>
              Current: <strong>{currentStatus.replace(/-/g, ' ')}</strong>
            </div>
          )}
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
