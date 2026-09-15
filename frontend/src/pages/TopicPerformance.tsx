import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowBack, ChevronLeft, ChevronRight, Close, ExpandMore } from '@mui/icons-material';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { analyticsApi, SubjectAnalyticsDTO, SubjectStatus } from '../api/analytics';
import { examsApi, Exam } from '../api/exams';
import { mocksApi } from '../api/mocks';
import {
  papersApi,
  PyqTopicPerformanceItem,
  TopicQuestionReview,
} from '../api/papers';
import { MathText, PyqText, renderOptionLabel } from '../utils/formatPyqText';
import { QuestionListSkeleton, TopicPerformanceSkeleton } from '../components/Shimmer';

type TopicRow = PyqTopicPerformanceItem;

function topicKey(t: Pick<TopicRow, 'sectionCode' | 'topic'>) {
  return `${t.sectionCode}::${t.topic}`;
}

function statusColor(status: string) {
  if (status === 'CORRECT') return 'var(--green)';
  if (status === 'INCORRECT') return 'var(--red)';
  return 'var(--text3)';
}

function statusLabel(status: string) {
  if (status === 'CORRECT') return 'Correct';
  if (status === 'INCORRECT') return 'Incorrect';
  return 'Skipped';
}

function formatDuration(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return null;
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m <= 0) return `${rem}s`;
  return `${m}m ${rem.toString().padStart(2, '0')}s`;
}

function speedBadge(label: string | null | undefined) {
  if (!label || label === 'OK') return null;
  if (label === 'SLOW') {
    return { text: 'Slow', color: 'var(--amber)', bg: 'rgba(245,158,11,0.12)' };
  }
  if (label === 'FAST') {
    return { text: 'Fast', color: 'var(--blue)', bg: 'rgba(33,150,243,0.12)' };
  }
  return null;
}

type ViewMode = 'mocks' | 'pyqs';

const MOCK_STATUS_BADGE: Record<SubjectStatus, string> = {
  IMPROVING: 'badge-green',
  DECLINING: 'badge-red',
  STABLE: 'badge-amber',
};

const MOCK_STATUS_LABEL: Record<SubjectStatus, string> = {
  IMPROVING: '↑ Improving',
  DECLINING: '↓ Declining',
  STABLE: '→ Stable',
};

const PAGE_WRAP: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  width: '100%',
  padding: '32px 24px',
};

const TopicPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('pyqs');
  const [viewInitialized, setViewInitialized] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drillTopic, setDrillTopic] = useState<TopicRow | null>(null);
  const [drillQuestions, setDrillQuestions] = useState<TopicQuestionReview[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [drillFilter, setDrillFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED'>('ALL');

  useEffect(() => {
    examsApi
      .getAllOrdered()
      .then((list) => {
        setExams(list);
        if (list.length > 0) setSelectedExamId(list[0].id);
      })
      .catch(() => setExams([]));
  }, []);

  const {
    data: pyqData,
    isLoading: pyqLoading,
    error: pyqQueryError,
    refetch: refetchPyq,
  } = useQuery({
    queryKey: ['pyq-topic-performance', selectedExamId],
    queryFn: () => papersApi.getTopicPerformance(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 30000,
  });

  const { data: mockAnalytics, isLoading: mockAnalyticsLoading } = useQuery({
    queryKey: ['subject-analytics', selectedExamId],
    queryFn: () => analyticsApi.getSubjectAnalytics(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 30000,
  });

  const { data: mocksPage, isLoading: mocksLoading } = useQuery({
    queryKey: ['mocks', 50],
    queryFn: () => mocksApi.list(0, 50),
    staleTime: 30000,
  });

  const performance = pyqData?.topics ?? [];
  const attemptCount = pyqData?.attemptCount ?? 0;
  const topicsTagged = Boolean(pyqData?.topicsTagged);
  const pyqError = pyqQueryError ? (pyqQueryError as Error).message : null;
  const mockSubjects = mockAnalytics?.subjects ?? [];

  const isMocks = viewMode === 'mocks';
  const loading = !selectedExamId || (isMocks ? mockAnalyticsLoading : pyqLoading);
  const initLoading = pyqLoading || mockAnalyticsLoading || mocksLoading;

  useEffect(() => {
    setViewInitialized(false);
  }, [selectedExamId]);

  useEffect(() => {
    if (viewInitialized || !selectedExamId || initLoading) return;
    const pyqQuestions = performance.reduce(
      (s, i) => s + i.correct + i.incorrect + i.unattempted,
      0
    );
    const examMocks = (mocksPage?.content ?? []).filter((m) => m.examId === selectedExamId);
    const mockQuestions = examMocks.reduce((s, m) => s + (m.attempted ?? 0), 0);
    setViewMode(pyqQuestions > mockQuestions ? 'pyqs' : 'mocks');
    setViewInitialized(true);
  }, [viewInitialized, selectedExamId, initLoading, performance, mocksPage?.content]);

  const openTopicDrill = useCallback(
    async (item: TopicRow) => {
      setDrillTopic(item);
      setDrillQuestions([]);
      setDrillError(null);
      setDrillFilter('ALL');
      setDrillLoading(true);
      try {
        const data = await papersApi.getTopicQuestions(
          item.sectionCode,
          item.topic,
          selectedExamId || undefined
        );
        setDrillQuestions(data.questions || []);
      } catch (err: unknown) {
        setDrillError((err as Error).message || 'Failed to load topic questions');
      } finally {
        setDrillLoading(false);
      }
    },
    [selectedExamId]
  );

  const closeTopicDrill = useCallback(() => {
    setDrillTopic(null);
    setDrillQuestions([]);
    setDrillError(null);
  }, []);

  const filteredDrillQuestions = useMemo(() => {
    if (drillFilter === 'ALL') return drillQuestions;
    return drillQuestions.filter((q) => q.status === drillFilter);
  }, [drillQuestions, drillFilter]);

  const drillCounts = useMemo(() => {
    const counts = { ALL: 0, CORRECT: 0, INCORRECT: 0, UNATTEMPTED: 0 };
    for (const q of drillQuestions) {
      counts.ALL += 1;
      if (q.status === 'CORRECT') counts.CORRECT += 1;
      else if (q.status === 'INCORRECT') counts.INCORRECT += 1;
      else if (q.status === 'UNATTEMPTED') counts.UNATTEMPTED += 1;
    }
    return counts;
  }, [drillQuestions]);

  const toggleCollapse = (subject: string) => {
    setCollapsed((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const getPerf = (accuracy: number) => {
    if (accuracy >= 80) {
      return {
        level: 'Strong',
        color: 'var(--green)',
        borderColor: 'var(--green)',
        badgeBg: 'var(--green-glow)',
      };
    }
    if (accuracy >= 60) {
      return {
        level: 'Average',
        color: 'var(--amber)',
        borderColor: 'var(--amber)',
        badgeBg: 'rgba(245,158,11,0.12)',
      };
    }
    return {
      level: 'Weak',
      color: 'var(--red)',
      borderColor: 'var(--red)',
      badgeBg: 'var(--red-glow)',
    };
  };

  const { subjectData, sorted } = useMemo(() => {
    const subjectData: Record<
      string,
      {
        topics: TopicRow[];
        totalCorrect: number;
        totalIncorrect: number;
        totalUnattempted: number;
        overallAccuracy: number;
        weakTopics: number;
      }
    > = {};

    performance.forEach((item) => {
      const subject = item.subject || item.sectionCode || 'Miscellaneous';
      if (!subjectData[subject]) {
        subjectData[subject] = {
          topics: [],
          totalCorrect: 0,
          totalIncorrect: 0,
          totalUnattempted: 0,
          overallAccuracy: 0,
          weakTopics: 0,
        };
      }
      subjectData[subject].topics.push({
        ...item,
        subject,
        topic: item.topic || 'General',
      });
      subjectData[subject].totalCorrect += item.correct;
      subjectData[subject].totalIncorrect += item.incorrect;
      subjectData[subject].totalUnattempted += item.unattempted;
    });

    Object.keys(subjectData).forEach((s) => {
      const d = subjectData[s];
      const total = d.totalCorrect + d.totalIncorrect + d.totalUnattempted;
      // Skips count in the denominator — same weight as wrong for weakness ranking.
      d.overallAccuracy = total > 0 ? (d.totalCorrect / total) * 100 : 0;
      d.weakTopics = d.topics.filter((t) => t.accuracy < 60).length;
      d.topics.sort((a, b) => {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        const aMiss = a.missed ?? a.incorrect + a.unattempted;
        const bMiss = b.missed ?? b.incorrect + b.unattempted;
        return bMiss - aMiss;
      });
    });

    const sorted = Object.keys(subjectData).sort(
      (a, b) => subjectData[a].overallAccuracy - subjectData[b].overallAccuracy
    );
    return { subjectData, sorted };
  }, [performance]);

  const examMocks = useMemo(
    () => (mocksPage?.content ?? []).filter((m) => m.examId === selectedExamId),
    [mocksPage?.content, selectedExamId]
  );

  const sortedMockSubjects = useMemo(
    () => [...mockSubjects].sort((a, b) => a.avgAccuracy - b.avgAccuracy),
    [mockSubjects]
  );

  const mockOverview = useMemo(() => {
    if (mockSubjects.length === 0) {
      return {
        avgAccuracy: 0,
        avgAttemptsPerMock: 0,
        mocksLogged: examMocks.length,
        weakSubjects: 0,
        improvingSubjects: 0,
      };
    }
    const avgAccuracy =
      mockSubjects.reduce((s, sub) => s + sub.avgAccuracy, 0) / mockSubjects.length;
    const avgAttemptsPerMock =
      mockSubjects.reduce((s, sub) => s + sub.avgAttemptsPerMock, 0) / mockSubjects.length;
    const mocksLogged = Math.max(...mockSubjects.map((s) => s.totalMocksAttempted), examMocks.length);
    return {
      avgAccuracy,
      avgAttemptsPerMock,
      mocksLogged,
      weakSubjects: mockSubjects.filter((s) => s.avgAccuracy < 80).length,
      improvingSubjects: mockSubjects.filter((s) => s.status === 'IMPROVING').length,
    };
  }, [mockSubjects, examMocks.length]);

  const orderedTopics = useMemo(() => {
    const list: TopicRow[] = [];
    for (const subject of sorted) {
      for (const t of subjectData[subject].topics) {
        list.push(t);
      }
    }
    return list;
  }, [sorted, subjectData]);

  const drillTopicIndex = useMemo(() => {
    if (!drillTopic) return -1;
    const key = topicKey(drillTopic);
    return orderedTopics.findIndex((t) => topicKey(t) === key);
  }, [drillTopic, orderedTopics]);

  const drillPrevTopic = drillTopicIndex > 0 ? orderedTopics[drillTopicIndex - 1] : null;
  const drillNextTopic =
    drillTopicIndex >= 0 && drillTopicIndex < orderedTopics.length - 1
      ? orderedTopics[drillTopicIndex + 1]
      : null;

  const goAdjacentTopic = useCallback(
    (delta: -1 | 1) => {
      if (drillTopicIndex < 0) return;
      const target = orderedTopics[drillTopicIndex + delta];
      if (target) void openTopicDrill(target);
    },
    [drillTopicIndex, orderedTopics, openTopicDrill]
  );

  useEffect(() => {
    if (!drillTopic) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTopicDrill();
      if (e.key === 'ArrowLeft' && drillPrevTopic) goAdjacentTopic(-1);
      if (e.key === 'ArrowRight' && drillNextTopic) goAdjacentTopic(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drillTopic, closeTopicDrill, drillPrevTopic, drillNextTopic, goAdjacentTopic]);

  if (loading) {
    return (
      <DashboardLayout>
        <TopicPerformanceSkeleton />
      </DashboardLayout>
    );
  }

  if (!isMocks && pyqError) {
    return (
      <DashboardLayout>
        <div style={PAGE_WRAP}>
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--red-glow)',
              border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: 10,
              color: 'var(--red)',
              fontSize: 14,
            }}
          >
            {pyqError}
            <button
              type="button"
              onClick={() => void refetchPyq()}
              style={{
                marginLeft: 12,
                background: 'var(--red)',
                color: 'var(--on-color)',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalQuestions = performance.reduce((s, i) => s + i.correct + i.incorrect + i.unattempted, 0);
  const totalCorrect = performance.reduce((s, i) => s + i.correct, 0);
  const totalSkipped = performance.reduce((s, i) => s + i.unattempted, 0);
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const weakSubjects = sorted.filter((s) => subjectData[s].overallAccuracy < 60).length;
  const strongSubjects = sorted.filter((s) => subjectData[s].overallAccuracy >= 80).length;

  const pyqEmpty = !isMocks && performance.length === 0;
  const mockEmpty = isMocks && mockSubjects.length === 0;

  const renderHeader = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 28,
        alignItems: 'flex-start',
      }}
    >
      <div>
        <h1 className="page-title">Topic Performance</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text3)' }}>
          {isMocks
            ? 'Subject accuracy and attempt patterns from your logged mocks'
            : `From ${attemptCount} PYQ attempt${attemptCount === 1 ? '' : 's'}${topicsTagged ? '' : ' · some questions may be uncategorized'} · skips count as misses`}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {exams.length > 0 && (
          <select
            className="select"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            style={{ minWidth: 140 }}
          >
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        )}
        <div className="tabs" role="tablist" aria-label="Performance source">
          <button
            type="button"
            className={`tab ${isMocks ? 'active' : ''}`}
            onClick={() => setViewMode('mocks')}
          >
            Mocks
          </button>
          <button
            type="button"
            className={`tab ${!isMocks ? 'active' : ''}`}
            onClick={() => setViewMode('pyqs')}
          >
            PYQs
          </button>
        </div>
      </div>
    </div>
  );

  if (pyqEmpty || mockEmpty) {
    return (
      <DashboardLayout>
        <div style={PAGE_WRAP}>
          {renderHeader()}
          <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              {isMocks
                ? 'No mock subject data yet. Log external mocks with section-wise scores to see accuracy and attempt trends here.'
                : 'No PYQ topic data yet. Take a timed PYQ paper and submit it — topics from the paper will show up here.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(isMocks ? '/add-mock' : '/pyq-tests')}
            >
              {isMocks ? 'Add a mock' : 'Go to PYQ Tests'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={PAGE_WRAP}>
        {renderHeader()}

        {isMocks ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                gap: 14,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: 'AVG ACCURACY',
                  value: `${mockOverview.avgAccuracy.toFixed(1)}%`,
                  color: 'var(--accent2)',
                  bg: 'rgba(99,102,241,0.08)',
                  border: 'rgba(99,102,241,0.25)',
                },
                {
                  label: 'AVG ATTEMPTS',
                  value: mockOverview.avgAttemptsPerMock.toFixed(1),
                  color: 'var(--blue)',
                  bg: 'rgba(33,150,243,0.08)',
                  border: 'rgba(33,150,243,0.25)',
                },
                {
                  label: 'MOCKS LOGGED',
                  value: mockOverview.mocksLogged,
                  color: 'var(--text)',
                  bg: 'var(--surface2)',
                  border: 'var(--border)',
                },
                {
                  label: 'WEAK SUBJECTS',
                  value: mockOverview.weakSubjects,
                  color: mockOverview.weakSubjects > 0 ? 'var(--red)' : 'var(--green)',
                  bg: mockOverview.weakSubjects > 0 ? 'var(--red-glow)' : 'var(--green-glow)',
                  border: mockOverview.weakSubjects > 0 ? 'rgba(244,63,94,0.3)' : 'rgba(34,211,160,0.3)',
                },
                {
                  label: 'IMPROVING',
                  value: mockOverview.improvingSubjects,
                  color: 'var(--green)',
                  bg: 'var(--green-glow)',
                  border: 'rgba(34,211,160,0.3)',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="card"
                  style={{
                    background: card.bg,
                    border: `1px solid ${card.border}`,
                    padding: '20px 18px',
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 500, color: card.color, lineHeight: 1 }}>
                    {card.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: card.color,
                      marginTop: 6,
                    }}
                  >
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '12px 18px',
                background: 'rgba(124,106,255,0.07)',
                border: '1px solid rgba(124,106,255,0.2)',
                borderRadius: 10,
                marginBottom: 28,
                fontSize: 13,
                color: 'var(--text2)',
              }}
            >
              Accuracy is averaged across logged mocks. Avg attempts is questions attempted per mock per
              subject. Trend compares your last five mocks to the previous five.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                gap: 16,
              }}
            >
              {sortedMockSubjects.map((subject: SubjectAnalyticsDTO) => {
                const accuracyColor =
                  subject.avgAccuracy >= 90
                    ? 'var(--green)'
                    : subject.avgAccuracy >= 70
                      ? 'var(--amber)'
                      : 'var(--red)';
                const trendColor = subject.trend >= 0 ? 'var(--green)' : 'var(--red)';
                return (
                  <div key={subject.subjectName} className="card" style={{ padding: '18px 20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>{subject.subjectName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                          {subject.totalMocksAttempted} mock
                          {subject.totalMocksAttempted !== 1 ? 's' : ''}
                          {subject.lastAttemptedDate && (
                            <>
                              {' '}
                              · last{' '}
                              {new Date(subject.lastAttemptedDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`badge ${MOCK_STATUS_BADGE[subject.status]}`}>
                        {MOCK_STATUS_LABEL[subject.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 500, color: accuracyColor, marginBottom: 10 }}>
                      {subject.avgAccuracy.toFixed(1)}%
                    </div>
                    <div className="progress-track" style={{ marginBottom: 16 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, subject.avgAccuracy)}%`,
                          background: `linear-gradient(90deg, ${accuracyColor}, ${accuracyColor}88)`,
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Avg attempts / mock</div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>
                          {subject.avgAttemptsPerMock.toFixed(1)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Trend (last 5 vs prev 5)</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: trendColor }}>
                          {subject.trend === 0
                            ? '—'
                            : `${subject.trend > 0 ? '+' : ''}${subject.trend.toFixed(1)}%`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'ACCURACY', value: `${overallAccuracy.toFixed(1)}%`, color: 'var(--accent2)', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
            { label: 'ATTEMPTS', value: attemptCount, color: 'var(--text)', bg: 'var(--surface2)', border: 'var(--border)' },
            { label: 'QUESTIONS', value: totalQuestions, color: 'var(--blue)', bg: 'rgba(33,150,243,0.08)', border: 'rgba(33,150,243,0.25)' },
            { label: 'SKIPPED', value: totalSkipped, color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
            { label: 'WEAK SUBJ.', value: weakSubjects, color: weakSubjects > 0 ? 'var(--red)' : 'var(--green)', bg: weakSubjects > 0 ? 'var(--red-glow)' : 'var(--green-glow)', border: weakSubjects > 0 ? 'rgba(244,63,94,0.3)' : 'rgba(34,211,160,0.3)' },
            { label: 'STRONG SUBJ.', value: strongSubjects, color: 'var(--green)', bg: 'var(--green-glow)', border: 'rgba(34,211,160,0.3)' },
          ].map((card) => (
            <div
              key={card.label}
              className="card"
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                padding: '20px 18px',
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 500, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: card.color,
                  marginTop: 6,
                }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '12px 18px',
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10,
            marginBottom: 28,
            fontSize: 13,
            color: 'var(--text2)',
          }}
        >
          Accuracy = correct ÷ all questions (wrong <strong>and</strong> skipped). Pace compares your
          average time per question to the exam timer. Click a topic to review every contributing
          question.
        </div>

        {sorted.map((subject) => {
          const d = subjectData[subject];
          const perf = getPerf(d.overallAccuracy);
          const totalQ = d.totalCorrect + d.totalIncorrect + d.totalUnattempted;
          const correctRatio = `${d.totalCorrect}/${totalQ}`;
          const isCollapsed = collapsed[subject] ?? true;

          return (
            <div
              key={subject}
              className="card"
              style={{
                marginBottom: 16,
                padding: 0,
                borderLeft: `3px solid ${perf.borderColor}`,
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => toggleCollapse(subject)}
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ExpandMore
                    sx={{
                      fontSize: 22,
                      color: 'var(--text3)',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>{subject}</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 500, color: perf.color }}>
                  {d.overallAccuracy.toFixed(0)}%
                </span>
              </div>

              <div
                style={{
                  paddingLeft: 22,
                  paddingBottom: 14,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 13,
                  color: 'var(--text3)',
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  {d.topics.length} topic{d.topics.length !== 1 ? 's' : ''}
                </span>
                <span>·</span>
                <span>
                  {totalQ} question{totalQ !== 1 ? 's' : ''}
                </span>
                <span>·</span>
                <span style={{ color: d.totalCorrect > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {correctRatio} correct
                </span>
                {d.totalUnattempted > 0 && (
                  <>
                    <span>·</span>
                    <span style={{ color: 'var(--amber)' }}>{d.totalUnattempted} skipped</span>
                  </>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 22px' }} />
                  <div
                    style={{
                      padding: '14px 22px 6px',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '0.5px',
                      color: 'var(--text3)',
                    }}
                  >
                    Topics · tap to open questions
                  </div>

                  {d.topics.map((item, idx) => {
                    const total = item.correct + item.incorrect + item.unattempted;
                    const tp = getPerf(item.accuracy);
                    const missed = item.missed ?? item.incorrect + item.unattempted;
                    const highSkip = item.unattempted > 0 && item.unattempted >= item.incorrect;
                    const speed = speedBadge(item.speedLabel);
                    const avgTime = formatDuration(item.avgSecondsSpent);

                    return (
                      <button
                        key={`${item.topic}-${idx}`}
                        type="button"
                        onClick={() => void openTopicDrill(item)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '14px 22px',
                          border: 'none',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          background: 'transparent',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>
                              {item.topic}
                            </span>
                            {highSkip && (
                              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>
                                · skips ≥ wrongs
                              </span>
                            )}
                            {speed && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: speed.color,
                                  background: speed.bg,
                                  padding: '2px 7px',
                                  borderRadius: 999,
                                }}
                              >
                                {speed.text}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 500, color: tp.color, flexShrink: 0 }}>
                            {item.accuracy.toFixed(1)}%
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)', flexWrap: 'wrap' }}>
                          <span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--green)',
                                marginRight: 5,
                                verticalAlign: 'middle',
                              }}
                            />
                            {item.correct} correct
                          </span>
                          <span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--red)',
                                marginRight: 5,
                                verticalAlign: 'middle',
                              }}
                            />
                            {item.incorrect} wrong
                          </span>
                          <span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--amber)',
                                marginRight: 5,
                                verticalAlign: 'middle',
                              }}
                            />
                            {item.unattempted} skipped
                          </span>
                          <span style={{ color: 'var(--text2)' }}>
                            {missed}/{total} missed
                          </span>
                          {avgTime && <span>avg {avgTime}/Q</span>}
                        </div>
                        {item.insight && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: 'var(--text2)',
                              lineHeight: 1.4,
                            }}
                          >
                            {item.insight}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
          </>
        )}

      {drillTopic && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Topic review: ${drillTopic.topic}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '12px 16px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeTopicDrill}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
              >
                <ArrowBack sx={{ fontSize: 18 }} />
                Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!drillPrevTopic || drillLoading}
                  onClick={() => goAdjacentTopic(-1)}
                  aria-label="Previous topic"
                  style={{ padding: '6px 8px', minWidth: 'auto', lineHeight: 0 }}
                >
                  <ChevronLeft sx={{ fontSize: 22 }} />
                </button>
                <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 72, textAlign: 'center' }}>
                  {drillTopicIndex >= 0 ? `${drillTopicIndex + 1} / ${orderedTopics.length}` : '—'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!drillNextTopic || drillLoading}
                  onClick={() => goAdjacentTopic(1)}
                  aria-label="Next topic"
                  style={{ padding: '6px 8px', minWidth: 'auto', lineHeight: 0 }}
                >
                  <ChevronRight sx={{ fontSize: 22 }} />
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeTopicDrill}
                aria-label="Close topic review"
                style={{ padding: '6px 8px', minWidth: 'auto', lineHeight: 0 }}
              >
                <Close sx={{ fontSize: 22 }} />
              </button>
            </div>
            <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <div style={{ fontWeight: 500, fontSize: 18 }}>{drillTopic.topic}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                {drillTopic.subject} · {drillTopic.correct}C / {drillTopic.incorrect}W /{' '}
                {drillTopic.unattempted}S · {drillTopic.accuracy.toFixed(1)}%
                {drillTopic.avgSecondsSpent != null &&
                  ` · avg ${formatDuration(drillTopic.avgSecondsSpent)}/Q`}
              </div>
              {drillTopic.insight && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{drillTopic.insight}</div>
              )}
              {(drillPrevTopic || drillNextTopic) && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 10,
                    flexWrap: 'wrap',
                    fontSize: 12,
                    color: 'var(--text3)',
                  }}
                >
                  {drillPrevTopic && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={drillLoading}
                      onClick={() => goAdjacentTopic(-1)}
                      style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                    >
                      <ChevronLeft sx={{ fontSize: 16 }} />
                      {drillPrevTopic.topic}
                    </button>
                  )}
                  {drillNextTopic && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={drillLoading}
                      onClick={() => goAdjacentTopic(1)}
                      style={{ fontSize: 12, padding: '4px 10px', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                    >
                      {drillNextTopic.topic}
                      <ChevronRight sx={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', width: '100%' }}>
              {!drillLoading && !drillError && drillQuestions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {(
                    [
                      { key: 'ALL', label: 'All' },
                      { key: 'INCORRECT', label: 'Incorrect' },
                      { key: 'UNATTEMPTED', label: 'Skipped' },
                      { key: 'CORRECT', label: 'Correct' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className="btn"
                      onClick={() => setDrillFilter(f.key)}
                      style={{
                        borderColor: drillFilter === f.key ? 'var(--accent)' : undefined,
                        background:
                          drillFilter === f.key
                            ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                            : undefined,
                        fontWeight: drillFilter === f.key ? 500 : 500,
                        fontSize: 13,
                        minHeight: 36,
                      }}
                    >
                      {f.label} ({drillCounts[f.key]})
                    </button>
                  ))}
                </div>
              )}
              {drillLoading && <QuestionListSkeleton count={3} />}
              {drillError && (
                <div style={{ color: 'var(--red)', fontSize: 14, padding: 12 }}>{drillError}</div>
              )}
              {!drillLoading && !drillError && drillQuestions.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 14, padding: 12 }}>
                  No questions found for this topic.
                </div>
              )}
              {!drillLoading && !drillError && drillQuestions.length > 0 && filteredDrillQuestions.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 14, padding: 12 }}>
                  No questions in this filter.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredDrillQuestions.map((q) => (
                  <div
                    key={`${q.attemptId}-${q.qNo}`}
                    className="card"
                    style={{
                      padding: 14,
                      borderLeft: `3px solid ${statusColor(q.status)}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                        fontSize: 12,
                        color: 'var(--text3)',
                      }}
                    >
                      <span>
                        Q{q.qNo} · {q.paperTitle}
                      </span>
                      <span style={{ color: statusColor(q.status), fontWeight: 500 }}>
                        {statusLabel(q.status)} · {q.scoreDelta > 0 ? '+' : ''}
                        {q.scoreDelta.toFixed(1)}
                        {q.secondsSpent != null ? ` · ${formatDuration(q.secondsSpent)}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
                      <PyqText text={q.stem} jumble options={q.options} />
                    </div>
                    {q.type === 'MCQ' && q.options && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {(['1', '2', '3', '4'] as const).map((key) => {
                          const text = q.options?.[key];
                          if (text == null) return null;
                          const isCorrect = q.correctAnswer === key;
                          const isYours = q.userAnswer === key;
                          return (
                            <div
                              key={key}
                              style={{
                                fontSize: 13,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: `1px solid ${
                                  isCorrect ? 'var(--green)' : isYours ? 'var(--red)' : 'var(--border)'
                                }`,
                                background: isCorrect
                                  ? 'var(--green-glow)'
                                  : isYours
                                    ? 'var(--red-glow)'
                                    : 'transparent',
                              }}
                            >
                              {renderOptionLabel(key, text)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type !== 'MCQ' && (
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                        Your answer:{' '}
                        <strong>
                          <MathText text={q.userAnswer || '—'} />
                        </strong>
                        {' · '}
                        Correct:{' '}
                        <strong>
                          <MathText text={q.correctAnswer} />
                        </strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default TopicPerformancePage;
