import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { examsApi, Exam } from '../api/exams';
import {
  papersApi,
  PyqTopicPerformanceItem,
  TopicQuestionReview,
} from '../api/papers';
import { MathText, PyqText, renderOptionLabel } from '../utils/formatPyqText';

type TopicRow = PyqTopicPerformanceItem;

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

const TopicPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [performance, setPerformance] = useState<TopicRow[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [topicsTagged, setTopicsTagged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const loadTopicPerformance = async (examId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await papersApi.getTopicPerformance(examId || undefined);
      setPerformance(data.topics || []);
      setAttemptCount(data.attemptCount || 0);
      setTopicsTagged(Boolean(data.topicsTagged));
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load topic performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedExamId) return;
    void loadTopicPerformance(selectedExamId);
  }, [selectedExamId]);

  const openTopicDrill = async (item: TopicRow) => {
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
  };

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

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Loading PYQ topic performance...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
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
            {error}
            <button
              onClick={() => void loadTopicPerformance(selectedExamId)}
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

  if (performance.length === 0) {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            <div>
              <h1 className="page-title">Topic Performance</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text3)' }}>
                Built from your submitted PYQ attempts and labelled question topics
              </p>
            </div>
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
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              No PYQ topic data yet. Take a timed PYQ paper and submit it — topics from the paper will
              show up here.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/pyq-tests')}>
              Go to PYQ Tests
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalQuestions = performance.reduce((s, i) => s + i.correct + i.incorrect + i.unattempted, 0);
  const totalSkipped = performance.reduce((s, i) => s + i.unattempted, 0);
  const weakSubjects = sorted.filter((s) => subjectData[s].overallAccuracy < 60).length;
  const strongSubjects = sorted.filter((s) => subjectData[s].overallAccuracy >= 80).length;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
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
              From {attemptCount} PYQ attempt{attemptCount === 1 ? '' : 's'}
              {topicsTagged ? '' : ' · some questions may be uncategorized'}
              {' · '}skips count as misses
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            <button className="btn" onClick={() => navigate('/pyq-tests')}>
              PYQ Tests
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'QUESTIONS', value: totalQuestions, color: 'var(--blue)', bg: 'rgba(33,150,243,0.08)', border: 'rgba(33,150,243,0.25)' },
            { label: 'SKIPPED', value: totalSkipped, color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
            { label: 'WEAK', value: weakSubjects, color: weakSubjects > 0 ? 'var(--red)' : 'var(--green)', bg: weakSubjects > 0 ? 'var(--red-glow)' : 'var(--green-glow)', border: weakSubjects > 0 ? 'rgba(244,63,94,0.3)' : 'rgba(34,211,160,0.3)' },
            { label: 'STRONG', value: strongSubjects, color: 'var(--green)', bg: 'var(--green-glow)', border: 'rgba(34,211,160,0.3)' },
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
              <div style={{ fontSize: 32, fontWeight: 700, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
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
                  <span
                    style={{
                      fontSize: 18,
                      color: 'var(--text3)',
                      display: 'inline-block',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▾
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{subject}</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 700, color: perf.color }}>
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
                      fontWeight: 600,
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
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
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
                                  fontWeight: 600,
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
                          <span style={{ fontSize: 16, fontWeight: 700, color: tp.color, flexShrink: 0 }}>
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
      </div>

      {drillTopic && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
          }}
          onClick={() => setDrillTopic(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: 'min(88vh, 820px)',
              overflow: 'auto',
              margin: 0,
              borderRadius: '16px 16px 0 0',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                padding: '16px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'flex-start',
                zIndex: 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{drillTopic.topic}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  {drillTopic.subject} · {drillTopic.correct}C / {drillTopic.incorrect}W /{' '}
                  {drillTopic.unattempted}S · {drillTopic.accuracy.toFixed(1)}%
                  {drillTopic.avgSecondsSpent != null &&
                    ` · avg ${formatDuration(drillTopic.avgSecondsSpent)}/Q`}
                </div>
                {drillTopic.insight && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                    {drillTopic.insight}
                  </div>
                )}
              </div>
              <button type="button" className="btn" onClick={() => setDrillTopic(null)}>
                Close
              </button>
            </div>

            <div style={{ padding: 16 }}>
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
                        fontWeight: drillFilter === f.key ? 700 : 500,
                        fontSize: 13,
                        minHeight: 36,
                      }}
                    >
                      {f.label} ({drillCounts[f.key]})
                    </button>
                  ))}
                </div>
              )}
              {drillLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <CircularProgress size={28} />
                </div>
              )}
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
                      <span style={{ color: statusColor(q.status), fontWeight: 700 }}>
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
    </DashboardLayout>
  );
};

export default TopicPerformancePage;
