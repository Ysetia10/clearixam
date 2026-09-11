import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
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
  StatusLegendIcon,
  countByStatus,
  getQuestionStatus,
  paletteClass,
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

function displayNameFromEmail(email: string | null) {
  if (!email) return 'Candidate';
  const local = email.split('@')[0] || 'Candidate';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function optionKeys(question: PaperQuestion): string[] {
  const opts = question.options || {};
  const preferred = ['1', '2', '3', '4', 'a', 'b', 'c', 'd'];
  const found = preferred.filter((k) => opts[k] != null && String(opts[k]).length > 0);
  if (found.length) return found;
  return Object.keys(opts);
}

function InstructionsModal({
  paper,
  isSectional,
  sectionMinutes,
  onBegin,
  onClose,
  viewOnly,
}: {
  paper: PaperDetail;
  isSectional: boolean;
  sectionMinutes: number;
  onBegin?: () => void;
  onClose?: () => void;
  viewOnly?: boolean;
}) {
  const m = paper.marking;
  const sections = sectionsFromPaper(paper);
  return (
    <div className="tt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Instructions">
      <div className="tt-modal card">
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{paper.title}</h2>
        <p style={{ margin: '0 0 16px', color: 'var(--tt-muted)', fontSize: 14 }}>
          {paper.questionCount} questions ·{' '}
          {isSectional
            ? `${sections.length} sections × ${sectionMinutes} min (sequential)`
            : `${paper.durationMinutes} minutes · single timer for all sections`}
        </p>
        <ul style={{ margin: '0 0 20px', paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--tt-text)' }}>
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
              <li>You can interact with only one section at a time — the same as the real exam.</li>
            </>
          ) : (
            <li>Use the question palette to jump between sections freely.</li>
          )}
          <li>
            <strong>Mark for Review</strong> flags a question to revisit within the current section.
          </li>
          <li>Use <strong>Save &amp; Next</strong> after selecting an answer. Clear Response removes your choice.</li>
          {!viewOnly && <li>The timer starts when you click Begin Test. Pause freezes the current timer.</li>}
          <li>Refreshing restores your answers and remaining time.</li>
        </ul>
        {viewOnly ? (
          <button type="button" className="tt-btn tt-btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Close
          </button>
        ) : (
          <button type="button" className="tt-btn tt-btn-primary" style={{ width: '100%' }} onClick={onBegin}>
            Begin Test
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionPaperModal({
  paper,
  questionNos,
  sectionName,
  onClose,
}: {
  paper: PaperDetail;
  questionNos: number[];
  sectionName: string;
  onClose: () => void;
}) {
  const qs = paper.questions.filter((q) => questionNos.includes(q.qNo));
  return (
    <div className="tt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Question paper">
      <div className="tt-modal card" style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Question Paper</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--tt-muted)' }}>{sectionName}</p>
          </div>
          <button type="button" className="tt-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="tt-paper-list">
          {qs.map((q) => (
            <div key={q.qNo} className="tt-paper-item">
              <div className="tt-paper-qno">Q{q.qNo}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                <PyqText text={q.stem} jumble options={q.options} />
                {q.options && (
                  <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                    {optionKeys(q).map((k) => (
                      <div key={k} style={{ color: 'var(--tt-muted)' }}>
                        {renderOptionLabel(k, q.options?.[k] || '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
    <div className="tt-modal-backdrop" role="dialog" aria-modal="true">
      <div className="tt-modal card" style={{ maxWidth: 440 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--tt-muted)' }}>
          You cannot change these answers after confirming.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16, fontSize: 14 }}>
          {[
            { label: 'Answered', value: counts.answered + counts.answeredMarked, color: '#2e7d32' },
            { label: 'Not answered (visited)', value: counts.notAnswered, color: '#c62828' },
            { label: 'Not visited', value: counts.notVisited, color: '#616161' },
            { label: 'Marked for review', value: markedCount, color: '#5e35b1' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{row.label}</span>
              <strong style={{ color: row.color }}>{row.value}</strong>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #ddd',
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span>{paperCountLabel}</span>
            <strong>
              {counts.answered +
                counts.answeredMarked +
                counts.notAnswered +
                counts.notVisited +
                counts.marked}
            </strong>
          </div>
        </div>
        {pending > 0 && (
          <p style={{ fontSize: 13, color: '#b45309', margin: '0 0 16px' }}>
            {pending} question{pending === 1 ? '' : 's'} still unanswered or only marked for review.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="tt-btn" style={{ flex: 1 }} disabled={submitting} onClick={onCancel}>
            Continue
          </button>
          <button
            type="button"
            className="tt-btn tt-btn-primary"
            style={{ flex: 1 }}
            disabled={submitting}
            onClick={onConfirm}
          >
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [showQuestionPaper, setShowQuestionPaper] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsSpent, setSecondsSpent] = useState<Record<string, number>>({});
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
  const [marked, setMarked] = useState<Set<number>>(() => new Set());
  const [index, setIndex] = useState(0);
  const [paletteSection, setPaletteSection] = useState<SectionCode>('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const autoSubmitted = useRef(false);
  const sectionAdvanceLock = useRef(false);
  const answersRef = useRef(answers);
  const secondsSpentRef = useRef(secondsSpent);
  const activeSegmentRef = useRef<{ qNo: number; startedAt: number } | null>(null);
  const startGeneration = useRef(0);
  const showToastRef = useRef(showToast);
  const navigateRef = useRef(navigate);
  const userEmail = getUserEmail();
  answersRef.current = answers;
  secondsSpentRef.current = secondsSpent;
  showToastRef.current = showToast;
  navigateRef.current = navigate;

  const isSectional = paper?.timingMode === 'sectional';
  const sectionMetas = useMemo(() => (paper ? sectionsFromPaper(paper) : []), [paper]);
  const sectionMinutes =
    (isSectional
      ? sectionMetas[activeSectionIndex]?.durationMinutes ?? paper?.sectionDurationMinutes
      : paper?.sectionDurationMinutes) ??
    sectionMetas[0]?.durationMinutes ??
    15;
  const showCalculator = paper?.calculator !== false;
  const activeSection = sectionMetas[activeSectionIndex] ?? null;
  const isLastSection = !isSectional || activeSectionIndex >= sectionMetas.length - 1;
  const candidateName = displayNameFromEmail(userEmail);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = () => {
      if (!mq.matches) setPaletteOpen(false);
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
          const secIdx = Math.max(0, Math.min(sections.length - 1, draft.activeSectionIndex ?? 0));
          setAnswers(draft.answers || {});
          setSecondsSpent(draft.secondsSpent || {});
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
              (q) =>
                q.qNo === started.paper.questions[resumeIndex]?.qNo &&
                q.sectionCode === resumeSection.code
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
          setSecondsSpent({});
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

  const flushActiveSegment = useCallback(() => {
    const seg = activeSegmentRef.current;
    if (!seg) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - seg.startedAt) / 1000));
    activeSegmentRef.current = null;
    if (elapsed <= 0) return;
    const key = String(seg.qNo);
    const next = {
      ...secondsSpentRef.current,
      [key]: (secondsSpentRef.current[key] || 0) + elapsed,
    };
    secondsSpentRef.current = next;
    setSecondsSpent(next);
  }, []);

  const beginTest = useCallback(() => {
    if (!paper) return;
    const sections = sectionsFromPaper(paper);
    const total =
      paper.timingMode === 'sectional'
        ? (sections[0]?.durationMinutes ?? paper.sectionDurationMinutes ?? 15) * 60
        : paper.durationMinutes * 60;
    setTestStarted(true);
    setPaused(false);
    setSecondsLeft(total);
    setEndsAtMs(Date.now() + total * 1000);
  }, [paper]);

  const togglePause = useCallback(() => {
    if (!paused) {
      flushActiveSegment();
      const left =
        endsAtMs != null ? Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000)) : secondsLeft ?? 0;
      setSecondsLeft(left);
      setEndsAtMs(null);
      setPaused(true);
      return;
    }
    const remaining = secondsLeft ?? 0;
    setEndsAtMs(Date.now() + remaining * 1000);
    setPaused(false);
  }, [paused, endsAtMs, secondsLeft, flushActiveSegment]);

  const submit = useCallback(async () => {
    if (!attemptId || submitting || autoSubmitted.current) return;
    autoSubmitted.current = true;
    flushActiveSegment();
    setSubmitting(true);
    try {
      const result = await papersApi.submitAttempt(attemptId, {
        answers: answersRef.current,
        secondsSpent: secondsSpentRef.current,
      });
      if (paperId) clearPyqDraft(paperId, userEmail);
      navigate(`/test-result/${result.attemptId}`, { replace: true, state: { result } });
    } catch (e) {
      autoSubmitted.current = false;
      showToast((e as Error).message || 'Submit failed', 'error');
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  }, [attemptId, navigate, showToast, submitting, paperId, userEmail, flushActiveSegment]);

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
    flushActiveSegment();
    const nextIdx = activeSectionIndex + 1;
    const next = sections[nextIdx];
    const nextQIndex = paper.questions.findIndex((q) => q.sectionCode === next.code);
    const secSec = (next.durationMinutes ?? paper.sectionDurationMinutes ?? 15) * 60;

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
  }, [paper, activeSectionIndex, submit, showToast, flushActiveSegment]);

  useEffect(() => {
    flushActiveSegment();
    if (!paper || !testStarted || paused) return;
    const q = paper.questions[index];
    if (!q) return;
    activeSegmentRef.current = { qNo: q.qNo, startedAt: Date.now() };
    return () => {
      flushActiveSegment();
    };
  }, [paper, testStarted, paused, index, flushActiveSegment]);

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
      secondsSpent,
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
    secondsSpent,
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

  // Sectional exams always show the active section palette (real CAT/SSC behaviour).
  const effectivePaletteSection = isSectional && activeSection ? activeSection.code : paletteSection;

  const paletteQuestions = useMemo(() => {
    if (!paper) return [];
    return paper.questions.filter((q) => q.sectionCode === effectivePaletteSection);
  }, [paper, effectivePaletteSection]);

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
      if (i >= 0) {
        goToIndex(i);
        setPaletteOpen(false);
      }
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
  const timerPreviewSeconds = isSectional
    ? (sectionMetas[0]?.durationMinutes ?? sectionMinutes) * 60
    : paper.durationMinutes * 60;
  const submitButtonLabel = isSectional && !isLastSection ? 'Submit' : 'Submit';
  const hasStimulusPane = Boolean(question.stimulus) || Boolean(question.images?.length);
  const marking = paper.marking;
  const paletteSectionMeta =
    sectionMetas.find((s) => s.code === effectivePaletteSection) || activeSection || sectionMetas[0];

  return (
    <div className="tt-exam">
      {!testStarted && (
        <InstructionsModal
          paper={paper}
          isSectional={Boolean(isSectional)}
          sectionMinutes={sectionMetas[0]?.durationMinutes ?? sectionMinutes}
          onBegin={beginTest}
        />
      )}
      {testStarted && showInstructions && (
        <InstructionsModal
          paper={paper}
          isSectional={Boolean(isSectional)}
          sectionMinutes={sectionMinutes}
          viewOnly
          onClose={() => setShowInstructions(false)}
        />
      )}
      {showQuestionPaper && (
        <QuestionPaperModal
          paper={paper}
          questionNos={activeQuestionNos}
          sectionName={activeSection?.name || 'All questions'}
          onClose={() => setShowQuestionPaper(false)}
        />
      )}
      {paused && testStarted && (
        <div className="tt-modal-backdrop" style={{ zIndex: 90 }}>
          <div className="tt-modal card" style={{ maxWidth: 400, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Test paused</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--tt-muted)' }}>
              Timer is frozen at {formatTime(secondsLeft ?? 0)}.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13 }}>Answers stay saved. Resume when you are ready.</p>
            <button type="button" className="tt-btn tt-btn-primary" style={{ width: '100%' }} onClick={togglePause}>
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

      <header className="tt-topbar">
        <div className="tt-topbar-title">{paper.title}</div>
        <div className="tt-topbar-actions">
          <button
            type="button"
            className="tt-top-link"
            disabled={!testStarted}
            onClick={() => setShowInstructions(true)}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            View Instruction
          </button>
          <button
            type="button"
            className="tt-top-link"
            disabled={!testStarted}
            onClick={() => setShowQuestionPaper(true)}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
            Question Paper
          </button>
          {showCalculator && (
            <button
              type="button"
              className="tt-top-icon"
              disabled={!testStarted || submitting}
              onClick={() => setCalcOpen((v) => !v)}
              title="Calculator"
              aria-label="Calculator"
            >
              <CalculateOutlinedIcon fontSize="small" />
            </button>
          )}
          <button
            type="button"
            className="tt-top-icon"
            disabled={!testStarted || submitting}
            onClick={togglePause}
            title={paused ? 'Resume' : 'Pause'}
            aria-label={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <PlayArrowRoundedIcon fontSize="small" /> : <PauseRoundedIcon fontSize="small" />}
          </button>
          <button
            type="button"
            className="tt-btn tt-palette-toggle"
            disabled={!testStarted || submitting}
            onClick={() => setPaletteOpen((v) => !v)}
          >
            Palette
          </button>
        </div>
      </header>

      <nav className="tt-section-bar" aria-label="Sections">
        {sectionMetas.map((sec) => {
          const locked = isSectional && completedSections.includes(sec.code);
          const current = isSectional ? activeSection?.code === sec.code : effectivePaletteSection === sec.code;
          const accessible = canAccessSection(sec.code);
          return (
            <button
              key={sec.code}
              type="button"
              className={`tt-sec-tab${current ? ' tt-sec-tab-active' : ''}${locked ? ' tt-sec-tab-done' : ''}`}
              disabled={isSectional && !accessible}
              onClick={() => jumpToSection(sec.code)}
              title={
                locked
                  ? `${sec.name} (completed)`
                  : accessible
                    ? sec.name
                    : `${sec.name} (locked until current section is submitted)`
              }
            >
              <span className="tt-sec-tab-label">{sec.name}</span>
              <InfoOutlinedIcon className="tt-sec-info" sx={{ fontSize: 14 }} />
              {current && <span className="tt-sec-caret" aria-hidden />}
            </button>
          );
        })}
      </nav>

      <div className="tt-timebar">
        <div className="tt-timebar-section">
          {activeSection?.name || question.section}
          {isSectional ? ` · Section ${activeSectionIndex + 1}/${sectionMetas.length}` : ''}
        </div>
        <div
          className="tt-timebar-clock"
          style={{
            color: paused ? '#b45309' : testStarted && (secondsLeft ?? 0) <= 60 ? '#c62828' : undefined,
          }}
        >
          Time Left : {testStarted ? formatTime(secondsLeft ?? 0) : formatTime(timerPreviewSeconds)}
          {paused ? ' (Paused)' : ''}
        </div>
      </div>

      <div className="tt-body">
        <div className="tt-workspace">
          <main className={`tt-main${hasStimulusPane ? ' tt-main-split' : ''}`}>
            {hasStimulusPane && (
              <section className="tt-passage" aria-label="Passage or set">
                {question.setRange && (
                  <p className="tt-passage-intro">
                    The passage / set below is accompanied by questions Q{question.setRange[0]}–
                    {question.setRange[1]}. Choose the best answer to each question.
                  </p>
                )}
                {question.stimulus && (
                  <div className="tt-passage-text">
                    <PyqText text={question.stimulus} />
                  </div>
                )}
                {question.images?.map((src) => (
                  <img key={src} src={src} alt="Question figure" className="tt-passage-img" />
                ))}
              </section>
            )}

            <section className="tt-question-pane" aria-label="Question">
              <div className="tt-q-toolbar">
                <div className="tt-q-title">Question {question.qNo}</div>
                <div className="tt-q-marks">
                  Marks for correct answer: {marking.correct} | Negative Marks: {marking.incorrect}
                </div>
              </div>

              <div className="tt-stem">
                <PyqText text={question.stem} jumble options={question.options} />
              </div>

              {question.type === 'MCQ' && question.options ? (
                <div className="tt-options">
                  {optionKeys(question).map((key) => {
                    const text = question.options?.[key];
                    if (text == null) return null;
                    const selected = currentAnswer === key;
                    return (
                      <label key={key} className={`tt-option${selected ? ' tt-option-selected' : ''}`}>
                        <input
                          type="radio"
                          name={`q-${question.qNo}`}
                          checked={selected}
                          onChange={() => setAnswer(key)}
                        />
                        <span>{renderOptionLabel(key, text)}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <div className="tt-tita-label">Type-in answer (TITA)</div>
                  <input
                    className="tt-tita-input"
                    value={currentAnswer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter your answer"
                  />
                </div>
              )}

              {isMarked && <div className="tt-marked-flag">Marked for review</div>}
            </section>
          </main>

          <footer className="tt-footer">
            <div className="tt-footer-left">
              <button type="button" className="tt-btn" onClick={markAndNext}>
                Mark for Review &amp; Next
              </button>
              <button type="button" className="tt-btn" onClick={clearResponse}>
                Clear Response
              </button>
            </div>
            <div className="tt-footer-right">
              <button
                type="button"
                className="tt-btn"
                disabled={index <= sectionBounds.minIndex}
                onClick={() => goToIndex(index - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="tt-btn tt-btn-primary"
                onClick={saveAndNext}
                disabled={index >= sectionBounds.maxIndex}
              >
                Save &amp; Next
              </button>
              <button
                type="button"
                className="tt-btn tt-btn-submit"
                disabled={!testStarted || submitting || paused}
                onClick={() => setShowSubmitModal(true)}
              >
                {submitButtonLabel}
              </button>
            </div>
          </footer>
        </div>

        {paletteOpen && (
          <button
            type="button"
            className="tt-palette-backdrop"
            aria-label="Close palette"
            onClick={() => setPaletteOpen(false)}
          />
        )}

        <aside className={`tt-aside${paletteOpen ? ' tt-aside-open' : ''}`}>
          <div className="tt-aside-handle">
            <strong>Question palette</strong>
            <button type="button" className="tt-btn" onClick={() => setPaletteOpen(false)}>
              Close
            </button>
          </div>

          <div className="tt-candidate">
            <div className="tt-avatar" aria-hidden>
              <PersonOutlineIcon />
            </div>
            <div className="tt-candidate-name">{candidateName}</div>
          </div>

          <div className="tt-legend">
            <div className="tt-legend-item">
              <StatusLegendIcon status="answered" />
              <span>Answered</span>
            </div>
            <div className="tt-legend-item">
              <StatusLegendIcon status="not-answered" />
              <span>Not Answered</span>
            </div>
            <div className="tt-legend-item">
              <StatusLegendIcon status="not-visited" />
              <span>Not Visited</span>
            </div>
            <div className="tt-legend-item">
              <StatusLegendIcon status="marked" />
              <span>Marked for Review</span>
            </div>
            <div className="tt-legend-item tt-legend-wide">
              <StatusLegendIcon status="answered-marked" />
              <span>Answered &amp; Marked for Review (will be evaluated)</span>
            </div>
          </div>

          <div className="tt-palette-heading">
            {(paletteSectionMeta?.name || 'Questions').slice(0, 28)}
            {(paletteSectionMeta?.name?.length || 0) > 28 ? '…' : ''}
          </div>
          <div className="tt-palette-grid">
            {paletteQuestions.map((q) => {
              const i = paper.questions.findIndex((x) => x.qNo === q.qNo);
              const status = getQuestionStatus(q.qNo, visited, marked, answers);
              const active = i === index;
              const locked = isSectional && !canAccessSection(q.sectionCode);
              return (
                <button
                  key={q.qNo}
                  type="button"
                  className={`${paletteClass(status)}${active ? ' tt-pal-active' : ''}`}
                  title={`Q${q.qNo} — ${locked ? 'locked' : status.replace(/-/g, ' ')}`}
                  onClick={() => {
                    if (!locked) goToQuestion(q.qNo);
                  }}
                  disabled={locked}
                >
                  {q.qNo}
                  {status === 'answered-marked' && <span className="tt-pal-dot" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="tt-keys-hint">
            Keys: ← → navigate · M mark · 1–4 select MCQ
            {isSectional && (
              <>
                <br />
                Sections are sequential — finish or time out to unlock the next.
              </>
            )}
          </div>
        </aside>
      </div>

      {showCalculator && (
        <ExamCalculator open={calcOpen && testStarted && !paused} onClose={() => setCalcOpen(false)} />
      )}

      <style>{`
        .tt-exam {
          --tt-bg: #eceff1;
          --tt-panel: #ffffff;
          --tt-text: #212121;
          --tt-muted: #616161;
          --tt-border: #cfd8dc;
          --tt-blue: #1a5fb4;
          --tt-blue-soft: #2a6ebb;
          --tt-header: #37474f;
          min-height: 100vh;
          background: var(--tt-bg);
          color: var(--tt-text);
          display: flex;
          flex-direction: column;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }
        .tt-exam .card {
          background: var(--tt-panel);
          border: 1px solid var(--tt-border);
          border-radius: 4px;
          color: var(--tt-text);
        }
        .tt-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .tt-modal {
          max-width: 520px;
          width: 100%;
          padding: 24px;
          max-height: min(92vh, 720px);
          overflow: auto;
        }
        .tt-btn {
          appearance: none;
          border: 1px solid #90a4ae;
          background: #fff;
          color: #263238;
          border-radius: 3px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          line-height: 1.2;
        }
        .tt-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .tt-btn-primary {
          background: var(--tt-blue);
          border-color: var(--tt-blue);
          color: #fff;
        }
        .tt-btn-submit {
          background: #4fc3f7;
          border-color: #29b6f6;
          color: #0d47a1;
        }
        .tt-topbar {
          background: var(--tt-header);
          color: #fff;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tt-topbar-title {
          font-weight: 700;
          font-size: 15px;
        }
        .tt-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tt-top-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.35);
          color: #fff;
          border-radius: 3px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .tt-top-link:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .tt-top-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff;
          border-radius: 3px;
          cursor: pointer;
        }
        .tt-palette-toggle { display: none; }
        .tt-section-bar {
          display: flex;
          gap: 0;
          background: #f5f7fa;
          border-bottom: 1px solid var(--tt-border);
          overflow-x: auto;
        }
        .tt-sec-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid var(--tt-border);
          border-bottom: none;
          background: #fff;
          color: var(--tt-blue);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          margin-right: 2px;
        }
        .tt-sec-tab:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          color: #78909c;
        }
        .tt-sec-tab-active {
          background: var(--tt-blue);
          border-color: var(--tt-blue);
          color: #fff;
          opacity: 1;
        }
        .tt-sec-tab-done {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .tt-sec-caret {
          position: absolute;
          left: 50%;
          bottom: -7px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 7px solid var(--tt-blue);
        }
        .tt-sec-info { opacity: 0.75; }
        .tt-timebar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          background: #e3f2fd;
          border-bottom: 1px solid #bbdefb;
          font-size: 13px;
          font-weight: 600;
        }
        .tt-timebar-clock {
          font-variant-numeric: tabular-nums;
          color: #0d47a1;
        }
        .tt-body {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
        }
        .tt-workspace {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .tt-main {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: var(--tt-panel);
        }
        .tt-main-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          overflow: hidden;
        }
        .tt-passage {
          overflow: auto;
          padding: 16px 18px;
          border-right: 1px solid var(--tt-border);
          background: #fafafa;
          font-size: 14px;
          line-height: 1.65;
        }
        .tt-passage-intro {
          margin: 0 0 14px;
          font-weight: 700;
          font-size: 13px;
        }
        .tt-passage-text { overflow-wrap: anywhere; }
        .tt-passage-img {
          max-width: 100%;
          height: auto;
          display: block;
          margin-top: 12px;
          border: 1px solid var(--tt-border);
        }
        .tt-question-pane {
          overflow: auto;
          padding: 14px 18px 24px;
          background: #fff;
        }
        .tt-q-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: baseline;
          margin-bottom: 12px;
          flex-wrap: wrap;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        .tt-q-title { font-weight: 700; font-size: 14px; }
        .tt-q-marks { font-size: 12px; color: var(--tt-muted); }
        .tt-stem {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 16px;
          overflow-wrap: anywhere;
        }
        .tt-options { display: flex; flex-direction: column; gap: 8px; }
        .tt-option {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 8px 10px;
          border: 1px solid transparent;
          border-radius: 2px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.5;
        }
        .tt-option-selected {
          background: #e3f2fd;
          border-color: #90caf9;
        }
        .tt-option input { margin-top: 3px; }
        .tt-tita-label { font-size: 12px; color: var(--tt-muted); margin-bottom: 6px; }
        .tt-tita-input {
          width: 100%;
          max-width: 320px;
          padding: 8px 10px;
          border: 1px solid var(--tt-border);
          border-radius: 3px;
          font-size: 14px;
        }
        .tt-marked-flag {
          margin-top: 14px;
          font-size: 12px;
          font-weight: 700;
          color: #5e35b1;
        }
        .tt-footer {
          border-top: 1px solid var(--tt-border);
          background: #f5f7fa;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .tt-footer-left, .tt-footer-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tt-aside {
          border-left: 1px solid var(--tt-border);
          background: #fff;
          padding: 12px;
          overflow: auto;
        }
        .tt-aside-handle { display: none; }
        .tt-palette-backdrop { display: none; }
        .tt-candidate {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        .tt-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #eceff1;
          display: grid;
          place-items: center;
          color: #546e7a;
        }
        .tt-candidate-name { font-weight: 700; font-size: 13px; }
        .tt-legend {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 10px;
          margin-bottom: 14px;
          font-size: 11px;
          color: var(--tt-muted);
        }
        .tt-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tt-legend-wide { grid-column: 1 / -1; }
        .tt-palette-heading {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #37474f;
        }
        .tt-palette-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }
        .tt-pal {
          position: relative;
          height: 34px;
          border: none;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: grid;
          place-items: center;
          padding: 0;
        }
        .tt-pal:disabled { opacity: 0.4; cursor: not-allowed; }
        .tt-pal-active { outline: 2px solid #111; outline-offset: 1px; }
        .tt-pal-answered {
          background: #4caf50;
          clip-path: polygon(50% 0, 100% 28%, 100% 100%, 0 100%, 0 28%);
        }
        .tt-pal-not-answered {
          background: #e53935;
          clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
        }
        .tt-pal-not-visited {
          background: #bdbdbd;
          color: #212121;
          border-radius: 2px;
        }
        .tt-pal-marked,
        .tt-pal-answered-marked {
          background: #673ab7;
          border-radius: 50%;
        }
        .tt-pal-dot {
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4caf50;
          border: 1px solid #fff;
        }
        .tt-pal-legend {
          position: relative;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          pointer-events: none;
        }
        .tt-pal-legend.tt-pal-answered-marked::after {
          content: "";
          position: absolute;
          right: 1px;
          bottom: 1px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4caf50;
        }
        .tt-keys-hint {
          font-size: 11px;
          color: var(--tt-muted);
          line-height: 1.45;
        }
        .tt-paper-list {
          display: grid;
          gap: 14px;
        }
        .tt-paper-item {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }
        .tt-paper-qno { font-weight: 700; font-size: 13px; }

        @media (max-width: 1100px) {
          .tt-main-split { grid-template-columns: 1fr; }
          .tt-passage {
            border-right: none;
            border-bottom: 1px solid var(--tt-border);
            max-height: 40vh;
          }
        }

        @media (max-width: 900px) {
          .tt-palette-toggle { display: inline-flex; }
          .tt-body { grid-template-columns: 1fr; }
          .tt-aside {
            display: none;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            max-height: min(75vh, 560px);
            z-index: 70;
            border-left: none;
            border-top: 1px solid var(--tt-border);
            border-radius: 12px 12px 0 0;
            box-shadow: 0 -8px 28px rgba(0,0,0,0.2);
          }
          .tt-aside-open { display: block; }
          .tt-aside-handle {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .tt-palette-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 60;
            border: none;
            background: rgba(0,0,0,0.4);
          }
          .tt-keys-hint { display: none; }
          .tt-footer { flex-direction: column; }
          .tt-footer-left, .tt-footer-right { width: 100%; }
          .tt-footer .tt-btn { flex: 1; min-height: 40px; }
          .tt-sec-tab-label {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </div>
  );
};

export default TakeTest;
