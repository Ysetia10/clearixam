import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { examsApi, Exam } from '../api/exams';
import { papersApi, PyqTopicPerformanceItem } from '../api/papers';

type TopicRow = PyqTopicPerformanceItem;

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
      const total = d.totalCorrect + d.totalIncorrect;
      d.overallAccuracy = total > 0 ? (d.totalCorrect / total) * 100 : 0;
      d.weakTopics = d.topics.filter((t) => t.accuracy < 60).length;
      d.topics.sort((a, b) => a.accuracy - b.accuracy);
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
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
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
          <div
            className="card"
            style={{
              background: 'rgba(33,150,243,0.08)',
              border: '1px solid rgba(33,150,243,0.25)',
              padding: '20px 18px',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>
              {totalQuestions}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--blue)',
                marginTop: 6,
              }}
            >
              QUESTIONS
            </div>
          </div>
          <div
            className="card"
            style={{
              background: weakSubjects > 0 ? 'var(--red-glow)' : 'var(--green-glow)',
              border: `1px solid ${weakSubjects > 0 ? 'rgba(244,63,94,0.3)' : 'rgba(34,211,160,0.3)'}`,
              padding: '20px 18px',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: weakSubjects > 0 ? 'var(--red)' : 'var(--green)',
                lineHeight: 1,
              }}
            >
              {weakSubjects}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: weakSubjects > 0 ? 'var(--red)' : 'var(--green)',
                marginTop: 6,
              }}
            >
              WEAK
            </div>
          </div>
          <div
            className="card"
            style={{
              background: 'var(--green-glow)',
              border: '1px solid rgba(34,211,160,0.3)',
              padding: '20px 18px',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>
              {strongSubjects}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--green)',
                marginTop: 6,
              }}
            >
              STRONG
            </div>
          </div>
          <div
            className="card"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              padding: '20px 18px',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>
              {sorted.length}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--amber)',
                marginTop: 6,
              }}
            >
              SECTIONS
            </div>
          </div>
        </div>

        {weakSubjects > 0 && (
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
            Weak sections/topics are ordered lowest first — based on PYQ attempts only (not logged
            mocks).
          </div>
        )}

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
                    Topics
                  </div>

                  {d.topics.map((item, idx) => {
                    const total = item.correct + item.incorrect + item.unattempted;
                    const tp = getPerf(item.accuracy);
                    const highSkip = item.unattempted > total * 0.4;

                    return (
                      <div
                        key={`${item.topic}-${idx}`}
                        style={{
                          padding: '14px 22px',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                              {item.topic}
                            </span>
                            {highSkip && (
                              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>
                                · high skip rate
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 700, color: tp.color, marginLeft: 12 }}>
                            {item.accuracy.toFixed(1)}%
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)' }}>
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
                            {item.correct}
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
                            {item.incorrect}
                          </span>
                          <span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--text3)',
                                marginRight: 5,
                                verticalAlign: 'middle',
                              }}
                            />
                            {item.unattempted}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default TopicPerformancePage;
