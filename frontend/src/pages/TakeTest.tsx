import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { getUserEmail } from '../api/auth';
import { papersApi, PaperDetail, PaperQuestion } from '../api/papers';
import { useToast } from '../components/Toast';
import { ExamCalculator } from '../components/ExamCalculator';
import { PyqText, renderOptionLabel } from '../utils/formatPyqText';
import {
  clearPyqDraft,
  isDraftResumable,
  loadPyqDraft,
  remainingFromDraft,
  savePyqDraft,
} from '../utils/pyqAttemptDraft';
import {
  SectionCode,
  countByStatus,
  getQuestionStatus,
  paletteStyle,
  sectionsFromPaper,
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

function shortSectionLabel(code: string, name: string) {
  if (code.length <= 6) return code;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
  return code.slice(0, 6);
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
  isSectional,
  sectionMinutes,
  onBegin,
}: {
  paper: PaperDetail;
  isSectional: boolean;
  sectionMinutes: number;
  onBegin: () => void;
}) {
  const m = paper.marking;
  const sections = sectionsFromPaper(paper);
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
          {paper.questionCount} questions ·{' '}
          {isSectional
            ? `${sections.length} sections × ${sectionMinutes} min (sequential)`
            : `${paper.durationMinutes} minutes · single timer for all sections`}
        </p>
        <ul style={{ margin: '0 0 20px', paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
          <li>
            Marking: <strong>+{m.correct}</strong> correct, <strong>−{m.incorrect}</strong> incorrect,{' '}
            <strong>{m.unattempted}</strong> unattempted
          </li>
          {isSectional ? (
            <>
              <li>
                Each section has its own <strong>{sectionMinutes}-minute</strong> timer. When time ends (or you
                submit the section), you move to the next section and cannot go back.
              </li>
              <li>The next section unlocks only after the previous one is submitted or times out.</li>
            </>
          ) : (
            <li>Use the question palette to jump between sections freely.</li>
          )}
          <li>
            <strong>Mark for Review</strong> flags a question to revisit within the current section.
          </li>
          <li>The timer starts when you click Begin Test. Pause freezes the current timer.</li>
          <li>Refreshing restores your answers and remaining time.</li>
        </ul>
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onBegin}>
          Begin Test
        </button>
      </div>
    </div>
  );
}

function SubmitModal({
  title,
  confirmLabel,
  paperCountLabel,
  counts,
  markedCount,
  onCancel,
  onConfirm,
  submitting,
}: {
  title: string;
  confirmLabel: string;
  paperCountLabel: string;
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
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text3)' }}>
          You cannot change these answers after confirming.
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
            <span>{paperCountLabel}</span>
            <strong>{counts.answered + counts.answeredMarked + counts.notAnswered + counts.notVisited + counts.marked}</strong>
          </div>
        </div>
        {pending > 0 && (
          <p style={{ fontSize: 13, color: 'var(--amber)', margin: '0 0 16px' }}>
            {pending} question{pending === 1 ? '' : 's'} still unanswered or only marked for review.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" style={{ flex: 1 }} disabled={submitting} onClick={onCancel}>
            Continue
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={onConfirm}>
            {submitting ? 'Working…' : confirmLabel}
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
  const [paletteSection, setPaletteSection] = useState<SectionCode>('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const [showStimulus, setShowStimulus] = useState(true);
  const [paused, setPaused] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  const autoSubmitted = useRef(false);
  const sectionAdvanceLock = useRef(false);
  const answersRef = useRef(answers);
  const startGeneration = useRef(0);
  const showToastRef = useRef(showToast);
  const navigateRef = useRef(navigate);
  const userEmail = getUserEmail();
  answersRef.current = answers;
  showToastRef.current = showToast;
  navigateRef.current = navigate;

  const isSectional = paper?.timingMode === 'sectional';
  const sectionMetas = useMemo(() => (paper ? sectionsFromPaper(paper) : []), [paper]);
  const sectionMinutes = paper?.sectionDurationMinutes ?? sectionMetas[0]?.durationMinutes ?? 15;
  const showCalculator = paper?.calculator !== false;
  const activeSection = sectionMetas[activeSectionIndex] ?? null;
  const isLastSection = !isSectional || activeSectionIndex >= sectionMetas.length - 1;

  useEffect(() => {
    if (!paperId) return;
    const generation = ++startGeneration.current;
    let cancelled = false;
    const email = getUserEmail();

    (async () => {
      try {
        setLoading(true);
        setDraftReady(false);
        const started = await papersApi.startAttempt(paperId);
        if (cancelled || generation !== startGeneration.current) return;

        const draft = loadPyqDraft(paperId, email);
        const canResume = draft && isDraftResumable(draft);
        const sections = sectionsFromPaper(started.paper);
        const sectional = started.paper.timingMode === 'sectional';
        const secMins = started.paper.sectionDurationMinutes ?? sections[0]?.durationMinutes ?? 15;

        setAttemptId(started.attemptId);
        setPaper(started.paper);
        autoSubmitted.current = false;
        sectionAdvanceLock.current = false;

        if (canResume && draft) {
          const left = remainingFromDraft(draft) ?? (sectional ? secMins : started.durationMinutes) * 60;
          const secIdx = Math.max(
            0,
            Math.min(sections.length - 1, draft.activeSectionIndex ?? 0)
          );
          setAnswers(draft.answers || {});
          setVisited(
            new Set(
              draft.visited?.length
                ? draft.visited
                : ([started.paper.questions[0]?.qNo].filter(Boolean) as number[])
            )
          );
          setMarked(new Set(draft.marked || []));
          setActiveSectionIndex(secIdx);
          setCompletedSections(draft.completedSections || []);
          const resumeSection = sections[secIdx];
          let resumeIndex = Math.max(
            0,
            Math.min(started.paper.questions.length - 1, draft.index ?? 0)
          );
          if (sectional && resumeSection) {
            const inSection = started.paper.questions.findIndex(
              (q) => q.qNo === started.paper.questions[resumeIndex]?.qNo && q.sectionCode === resumeSection.code
            );
            if (inSection < 0) {
              resumeIndex = started.paper.questions.findIndex((q) => q.sectionCode === resumeSection.code);
            }
          }
          setIndex(Math.max(0, resumeIndex));
          setPaletteSection(
            (draft.paletteSection as SectionCode) ||
              resumeSection?.code ||
              (started.paper.questions[0]?.sectionCode as SectionCode) ||
              ''
          );
          setTestStarted(draft.testStarted);
          setPaused(Boolean(draft.paused && draft.testStarted));
          setSecondsLeft(left);
          if (draft.testStarted && !draft.paused) {
            setEndsAtMs(Date.now() + left * 1000);
          } else {
            setEndsAtMs(null);
          }
          if (draft.testStarted) {
            showToastRef.current('Restored your in-progress attempt', 'success');
          }
        } else {
          clearPyqDraft(paperId, email);
          const firstCode = sections[0]?.code || started.paper.questions[0]?.sectionCode || '';
          setSecondsLeft((sectional ? secMins : started.durationMinutes) * 60);
          setEndsAtMs(null);
          setIndex(0);
          setAnswers({});
          setVisited(new Set([started.paper.questions[0]?.qNo].filter(Boolean) as number[]));
          setMarked(new Set());
          setPaletteSection(firstCode);
          setActiveSectionIndex(0);
          setCompletedSections([]);
          setTestStarted(false);
          setPaused(false);
        }
      } catch (e) {
        if (cancelled || generation !== startGeneration.current) return;
        showToastRef.current((e as Error).message || 'Failed to start test', 'error');
        navigateRef.current('/pyq-tests');
      } finally {
        if (!cancelled && generation === startGeneration.current) {
          setLoading(false);
          setDraftReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paperId]);

  const beginTest = useCallback(() => {
    if (!paper) return;
    const total =
      paper.timingMode === 'sectional'
        ? (paper.sectionDurationMinutes ?? 15) * 60
        : paper.durationMinutes * 60;
    setTestStarted(true);
    setPaused(false);
    setSecondsLeft(total);
    setEndsAtMs(Date.now() + total * 1000);
  }, [paper]);

  const togglePause = useCallback(() => {
    if (!paused) {
      const left =
        endsAtMs != null
          ? Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000))
          : secondsLeft ?? 0;
      setSecondsLeft(left);
      setEndsAtMs(null);
      setPaused(true);
      return;
    }
    const remaining = secondsLeft ?? 0;
    setEndsAtMs(Date.now() + remaining * 1000);
    setPaused(false);
  }, [paused, endsAtMs, secondsLeft]);

  const submit = useCallback(async () => {
    if (!attemptId || submitting || autoSubmitted.current) return;
    autoSubmitted.current = true;
    setSubmitting(true);
    try {
      const result = await papersApi.submitAttempt(attemptId, answersRef.current);
      if (paperId) clearPyqDraft(paperId, userEmail);
      navigate(`/test-result/${result.attemptId}`, { replace: true, state: { result } });
    } catch (e) {
      autoSubmitted.current = false;
      showToast((e as Error).message || 'Submit failed', 'error');
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  }, [attemptId, navigate, showToast, submitting, paperId, userEmail]);

  const advanceSection = useCallback(() => {
    if (!paper || sectionAdvanceLock.current) return;
    const sections = sectionsFromPaper(paper);
    const current = sections[activeSectionIndex];
    if (!current) return;

    if (activeSectionIndex >= sections.length - 1) {
      void submit();
      return;
    }

    sectionAdvanceLock.current = true;
    const nextIdx = activeSectionIndex + 1;
    const next = sections[nextIdx];
    const nextQIndex = paper.questions.findIndex((q) => q.sectionCode === next.code);
    const secSec = (paper.sectionDurationMinutes ?? next.durationMinutes ?? 15) * 60;

    setCompletedSections((prev) => (prev.includes(current.code) ? prev : [...prev, current.code]));
    setActiveSectionIndex(nextIdx);
    setPaletteSection(next.code);
    if (nextQIndex >= 0) {
      setIndex(nextQIndex);
      setVisited((prev) => new Set(prev).add(paper.questions[nextQIndex].qNo));
    }
    setPaused(false);
    setSecondsLeft(secSec);
    setEndsAtMs(Date.now() + secSec * 1000);
    setShowSubmitModal(false);
    showToast(`Section locked. Starting ${next.name} (${secSec / 60} min)`, 'success');
    window.setTimeout(() => {
      sectionAdvanceLock.current = false;
    }, 400);
  }, [paper, activeSectionIndex, submit, showToast]);

  // Wall-clock timer
  useEffect(() => {
    if (!paper || loading || !testStarted || paused || endsAtMs == null) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
      setSecondsLeft(left);
    };

    tick();
    const t = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [paper, loading, testStarted, paused, endsAtMs]);

  useEffect(() => {
    if (!paper || loading || !testStarted || paused || secondsLeft !== 0) return;
    if (isSectional) {
      advanceSection();
    } else {
      void submit();
    }
  }, [secondsLeft, paper, loading, testStarted, paused, submit, isSectional, advanceSection]);

  useEffect(() => {
    if (!draftReady || !paperId || !attemptId || !paper || loading) return;
    savePyqDraft({
      version: 1,
      paperId,
      attemptId,
      userEmail,
      testStarted,
      answers,
      visited: [...visited],
      marked: [...marked],
      index,
      paletteSection,
      endsAtMs: paused ? null : endsAtMs,
      pausedRemainingSeconds: paused ? secondsLeft : null,
      paused,
      durationMinutes: paper.durationMinutes,
      savedAt: Date.now(),
      timingMode: isSectional ? 'sectional' : 'full',
      activeSectionIndex,
      completedSections,
      sectionDurationMinutes: sectionMinutes,
    });
  }, [
    draftReady,
    paperId,
    attemptId,
    paper,
    loading,
    testStarted,
    answers,
    visited,
    marked,
    index,
    paletteSection,
    endsAtMs,
    paused,
    secondsLeft,
    userEmail,
    isSectional,
    activeSectionIndex,
    completedSections,
    sectionMinutes,
  ]);

  const question: PaperQuestion | undefined = paper?.questions[index];

  const activeQuestionNos = useMemo(() => {
    if (!paper) return [];
    if (isSectional && activeSection) {
      return paper.questions.filter((q) => q.sectionCode === activeSection.code).map((q) => q.qNo);
    }
    return paper.questions.map((q) => q.qNo);
  }, [paper, isSectional, activeSection]);

  const counts = useMemo(
    () => countByStatus(activeQuestionNos, visited, marked, answers),
    [activeQuestionNos, visited, marked, answers]
  );

  const markedCount = counts.marked + counts.answeredMarked;

  const paletteQuestions = useMemo(() => {
    if (!paper) return [];
    return paper.questions.filter((q) => q.sectionCode === paletteSection);
  }, [paper, paletteSection]);

  const sectionBounds = useMemo(() => {
    if (!paper || !isSectional || !activeSection) {
      return { minIndex: 0, maxIndex: (paper?.questions.length ?? 1) - 1 };
    }
    const indices = paper.questions
      .map((q, i) => (q.sectionCode === activeSection.code ? i : -1))
      .filter((i) => i >= 0);
    return { minIndex: indices[0] ?? 0, maxIndex: indices[indices.length - 1] ?? 0 };
  }, [paper, isSectional, activeSection]);

  const canAccessSection = useCallback(
    (code: string) => {
      if (!isSectional) return true;
      if (completedSections.includes(code)) return false;
      return activeSection?.code === code;
    },
    [isSectional, completedSections, activeSection]
  );

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (!paper) return;
      let clamped = Math.max(0, Math.min(paper.questions.length - 1, nextIndex));
      if (isSectional) {
        clamped = Math.max(sectionBounds.minIndex, Math.min(sectionBounds.maxIndex, clamped));
      }
      const q = paper.questions[clamped];
      if (isSectional && !canAccessSection(q.sectionCode)) return;
      setIndex(clamped);
      setVisited((prev) => new Set(prev).add(q.qNo));
      setPaletteSection(q.sectionCode as SectionCode);
    },
    [paper, isSectional, sectionBounds, canAccessSection]
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
    if (index < sectionBounds.maxIndex) goToIndex(index + 1);
  }, [paper, index, goToIndex, sectionBounds.maxIndex]);

  const markAndNext = useCallback(() => {
    if (!question || !paper) return;
    setMarked((prev) => new Set(prev).add(question.qNo));
    if (index < sectionBounds.maxIndex) goToIndex(index + 1);
  }, [question, paper, index, goToIndex, sectionBounds.maxIndex]);

  const jumpToSection = useCallback(
    (section: SectionCode) => {
      if (!paper) return;
      if (!canAccessSection(section)) {
        if (completedSections.includes(section)) {
          showToast('That section is locked after submission/time-up', 'error');
        } else {
          showToast('Finish the current section first', 'error');
        }
        return;
      }
      setPaletteSection(section);
      const first = paper.questions.find((q) => q.sectionCode === section);
      if (first) goToQuestion(first.qNo);
    },
    [paper, canAccessSection, completedSections, goToQuestion, showToast]
  );

  const confirmSubmitAction = useCallback(() => {
    if (isSectional && !isLastSection) {
      advanceSection();
      return;
    }
    void submit();
  }, [isSectional, isLastSection, advanceSection, submit]);

  useEffect(() => {
    if (!paper || !testStarted || paused || !question) return;

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
  }, [paper, testStarted, paused, question, index, goToIndex, saveAndNext, toggleMarkCurrent]);

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
  const timerPreviewSeconds = isSectional ? sectionMinutes * 60 : paper.durationMinutes * 60;
  const submitButtonLabel = isSectional && !isLastSection ? 'Submit Section' : 'Submit Test';

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
      {!testStarted && (
        <InstructionsModal
          paper={paper}
          isSectional={Boolean(isSectional)}
          sectionMinutes={sectionMinutes}
          onBegin={beginTest}
        />
      )}
      {paused && testStarted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 400, width: '100%', padding: 24, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Test paused</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text3)' }}>
              Timer is frozen at {formatTime(secondsLeft ?? 0)}.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text2)' }}>
              Answers stay saved. Resume when you are ready.
            </p>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={togglePause}>
              Resume Test
            </button>
          </div>
        </div>
      )}
      {showSubmitModal && (
        <SubmitModal
          title={isSectional && !isLastSection ? 'Submit section?' : 'Submit test?'}
          confirmLabel={isSectional && !isLastSection ? 'Submit section' : 'Submit'}
          paperCountLabel={isSectional ? 'Section questions' : 'Total questions'}
          counts={counts}
          markedCount={markedCount}
          submitting={submitting}
          onCancel={() => setShowSubmitModal(false)}
          onConfirm={confirmSubmitAction}
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
            {question.topic ? ` · ${question.topic}` : ''}
            {isSectional && activeSection
              ? ` · Section ${activeSectionIndex + 1}/${sectionMetas.length}`
              : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Answered {counts.answered + counts.answeredMarked}/{activeQuestionNos.length}
            {markedCount > 0 && <> · Marked {markedCount}</>}
          </div>
          <div
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 800,
              fontSize: 18,
              color:
                paused
                  ? 'var(--amber)'
                  : testStarted && (secondsLeft ?? 0) <= 60
                    ? '#f43f5e'
                    : 'var(--accent)',
              minWidth: 64,
              textAlign: 'right',
            }}
            title={isSectional ? 'Section timer' : 'Paper timer'}
          >
            {testStarted ? formatTime(secondsLeft ?? 0) : formatTime(timerPreviewSeconds)}
            {paused && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6 }}>PAUSED</span>}
            {isSectional && !paused && (
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>section</div>
            )}
          </div>
          {showCalculator && (
            <button
              type="button"
              className="btn"
              disabled={!testStarted || submitting}
              onClick={() => setCalcOpen((v) => !v)}
              title="Calculator"
              aria-label="Calculator"
              aria-pressed={calcOpen}
              style={{ width: 40, height: 40, padding: 0, display: 'grid', placeItems: 'center' }}
            >
              <CalculateOutlinedIcon fontSize="small" />
            </button>
          )}
          <button
            type="button"
            className="btn"
            disabled={!testStarted || submitting}
            onClick={togglePause}
            title={paused ? 'Resume test' : 'Pause test'}
            aria-label={paused ? 'Resume test' : 'Pause test'}
            aria-pressed={paused}
            style={{ width: 40, height: 40, padding: 0, display: 'grid', placeItems: 'center' }}
          >
            {paused ? <PlayArrowRoundedIcon fontSize="small" /> : <PauseRoundedIcon fontSize="small" />}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!testStarted || submitting || paused}
            onClick={() => setShowSubmitModal(true)}
          >
            {submitButtonLabel}
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
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <PyqText text={question.stimulus} />
                  </div>
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

              <div style={{ fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
                <PyqText text={question.stem} jumble />
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
                          {renderOptionLabel(key, text)}
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
            <button
              type="button"
              className="btn"
              disabled={index <= sectionBounds.minIndex}
              onClick={() => goToIndex(index - 1)}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn"
              onClick={markAndNext}
              disabled={index >= sectionBounds.maxIndex}
            >
              Mark for Review &amp; Next →
            </button>
            <button type="button" className="btn" onClick={clearResponse}>
              Clear Response
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveAndNext}
              disabled={index >= sectionBounds.maxIndex}
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
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {sectionMetas.map((sec) => {
              const locked = isSectional && completedSections.includes(sec.code);
              const active = paletteSection === sec.code;
              const accessible = canAccessSection(sec.code);
              return (
                <button
                  key={sec.code}
                  type="button"
                  onClick={() => jumpToSection(sec.code)}
                  title={
                    locked
                      ? `${sec.name} (locked)`
                      : accessible
                        ? sec.name
                        : `${sec.name} (locked until previous submitted)`
                  }
                  style={{
                    flex: '1 1 40%',
                    padding: '6px 4px',
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    borderRadius: 8,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active
                      ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                      : locked
                        ? 'var(--surface2)'
                        : 'transparent',
                    color: accessible ? 'var(--text)' : 'var(--text3)',
                    cursor: accessible ? 'pointer' : 'not-allowed',
                    opacity: accessible ? 1 : 0.55,
                  }}
                >
                  {shortSectionLabel(sec.code, sec.name)}
                  {locked ? ' ✓' : ''}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text3)' }}>
            Question palette
            {isSectional && activeSection ? ` · ${activeSection.name}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 14 }}>
            {paletteQuestions.map((q) => {
              const i = paper.questions.findIndex((x) => x.qNo === q.qNo);
              const status = getQuestionStatus(q.qNo, visited, marked, answers);
              const active = i === index;
              const locked = isSectional && !canAccessSection(q.sectionCode);
              return (
                <button
                  key={q.qNo}
                  type="button"
                  title={`Q${q.qNo} — ${locked ? 'locked' : status.replace(/-/g, ' ')}`}
                  onClick={() => {
                    if (!locked) goToQuestion(q.qNo);
                  }}
                  disabled={locked}
                  style={{
                    ...paletteStyle(status, active),
                    opacity: locked ? 0.45 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
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
            {isSectional && (
              <>
                <br />
                Sections are sequential: finish or time out to unlock the next.
              </>
            )}
          </div>
          {currentStatus !== 'not-visited' && (
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text2)' }}>
              Current: <strong>{currentStatus.replace(/-/g, ' ')}</strong>
            </div>
          )}
        </aside>
      </div>

      {showCalculator && (
        <ExamCalculator open={calcOpen && testStarted && !paused} onClose={() => setCalcOpen(false)} />
      )}

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
