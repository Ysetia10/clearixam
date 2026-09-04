import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { 
  analyticsApi, 
  SubjectNeglectDTO, 
  AttemptAccuracyInsightDTO, 
  ImprovementDTO, 
  AdaptiveStrengthResponse,
  InsightsResponse,
  InsightType
} from '../api/analytics';
import { mocksApi } from '../api/mocks';
import { examsApi, Exam } from '../api/exams';
import { reportsApi } from '../api/reports';
import { goalsApi } from '../api/goals';
import { papersApi, RecentPyqAttempt } from '../api/papers';
import { GoalSettingDialog } from '../components/GoalSettingDialog';
import { MockDetailDialog } from '../components/MockDetailDialog';

type ActivityItem =
  | {
      kind: 'MOCK';
      id: string;
      date: string;
      title: string;
      examName: string;
      score: number;
      cutoffScore: number;
      probabilityScore: number | null;
    }
  | {
      kind: 'PYQ';
      id: string;
      date: string;
      title: string;
      examName: string;
      score: number;
      correctCount: number;
      incorrectCount: number;
      unattemptedCount: number;
      sections: RecentPyqAttempt['sections'];
    };

export const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [mockDetailOpen, setMockDetailOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAllOrdered,
  });

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const downloadReportMutation = useMutation({
    mutationFn: reportsApi.downloadPerformanceReport,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Clearixam_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', selectedExamId],
    queryFn: () => analyticsApi.getOverview(selectedExamId || undefined),
    staleTime: 30000,
    enabled: true,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend', selectedExamId],
    queryFn: () => analyticsApi.getTrend(selectedExamId || undefined),
    staleTime: 30000,
    enabled: true,
  });

  const { data: mocks, isLoading: mocksLoading } = useQuery({
    queryKey: ['mocks'],
    queryFn: () => mocksApi.list(0, 10),
    staleTime: 30000,
  });

  const { data: recentPyq = [], isLoading: pyqLoading } = useQuery({
    queryKey: ['pyq-recent-attempts', selectedExamId],
    queryFn: () => papersApi.listRecentAttempts(selectedExamId || undefined, 10),
    staleTime: 30000,
    enabled: !!selectedExamId,
  });

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const mockItems: ActivityItem[] = (mocks?.content || [])
      .filter((m) => !selectedExamId || m.examId === selectedExamId)
      .map((m) => ({
        kind: 'MOCK' as const,
        id: m.id,
        date: m.testDate,
        title: m.testName || 'Mock test',
        examName: m.examName,
        score: m.totalScore,
        cutoffScore: m.cutoffScore,
        probabilityScore: m.probabilityScore,
      }));

    const pyqItems: ActivityItem[] = recentPyq.map((a) => ({
      kind: 'PYQ' as const,
      id: a.attemptId,
      date: a.submittedAt || '',
      title: a.paperTitle,
      examName: a.examName,
      score: a.totalScore,
      correctCount: a.correctCount,
      incorrectCount: a.incorrectCount,
      unattemptedCount: a.unattemptedCount,
      sections: a.sections || [],
    }));

    return [...mockItems, ...pyqItems]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [mocks, recentPyq, selectedExamId]);

  const latestPyq = recentPyq[0] ?? null;

  const { data: neglectData } = useQuery({
    queryKey: ['subject-neglect', selectedExamId],
    queryFn: () => analyticsApi.getSubjectNeglect(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 60000,
  });

  const { data: attemptInsight } = useQuery({
    queryKey: ['attempt-accuracy', selectedExamId],
    queryFn: () => analyticsApi.getAttemptAccuracyInsight(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 60000,
  });

  const { data: improvement } = useQuery({
    queryKey: ['improvement', selectedExamId],
    queryFn: () => analyticsApi.getImprovement(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 60000,
  });

  const { data: adaptiveStrength } = useQuery({
    queryKey: ['adaptive-strength', selectedExamId],
    queryFn: () => analyticsApi.getAdaptiveStrength(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 60000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights', selectedExamId],
    queryFn: () => analyticsApi.getInsights(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 60000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    staleTime: 30000,
  });

  const neglectedSubjects = useMemo(() =>
    neglectData?.subjects.filter(s => s.status !== 'ACTIVE') ?? [],
  [neglectData]);

  const { data: mockDetail } = useQuery({
    queryKey: ['mock-detail', selectedMockId],
    queryFn: () => mocksApi.getDetail(selectedMockId!),
    enabled: !!selectedMockId && mockDetailOpen,
  });

  const handleViewMockDetail = useCallback((mockId: string) => {
    setSelectedMockId(mockId);
    setMockDetailOpen(true);
  }, []);

  const selectedExam = exams.find((e: Exam) => e.id === selectedExamId);

  const trendData = useMemo(() => {
    if (!trend?.trends) return [];
    return trend.trends.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      score: parseFloat(p.score.toFixed(2)),
      avg: parseFloat(p.movingAverage.toFixed(2)),
    }));
  }, [trend]);

  const legacyInsights = useMemo(() => {
    if (!overview) return [];
    const list = [];
    if (overview.performanceChange > 3) {
      list.push({ type: 'success' as const, message: `Improving steadily (+${overview.performanceChange.toFixed(1)} from last cycle)` });
    } else if (overview.performanceChange < -3) {
      list.push({ type: 'warning' as const, message: `Score dropped ${Math.abs(overview.performanceChange).toFixed(1)} recently. Review weak subjects.` });
    }
    if (overview.weakSubjects?.length > 0) {
      list.push({ type: 'warning' as const, message: `${overview.weakSubjects[0].subjectName} needs focus (${overview.weakSubjects[0].accuracy.toFixed(1)}% accuracy)` });
    } else if (overview.averageScore > 0) {
      list.push({ type: 'success' as const, message: 'No weak subjects detected. Great consistency!' });
    }
    return list.slice(0, 2);
  }, [overview]);

  const isLoading = overviewLoading || trendLoading || mocksLoading || pyqLoading;

  if (isLoading && !overview) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>Track your performance and progress</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {exams.length > 0 && (
            <select
              className="select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              {exams.map((exam: Exam) => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          )}
          <button className="btn" onClick={() => navigate('/pyq-tests')}>PYQ Tests</button>
          <button className="btn btn-primary" onClick={() => navigate('/add-mock')}>+ Add Mock</button>
        </div>
      </div>

      {legacyInsights.length > 0 && (
        <div className={`insight-banner ${legacyInsights[0].type === 'success' ? 'insight-banner-green' : 'insight-banner-red'}`} style={{ marginBottom: '24px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: legacyInsights[0].type === 'success' ? 'rgba(34,211,160,0.15)' : 'rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            {legacyInsights[0].type === 'success' ? '✓' : '⚠'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: legacyInsights[0].type === 'success' ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
              {legacyInsights[0].message}
            </div>
            {legacyInsights[1] && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{legacyInsights[1].message}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card stagger-1">
          <div className="stat-label">Average Score</div>
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>
            {overview?.averageScore ? overview.averageScore.toFixed(2) : <span className="badge badge-amber">No data</span>}
          </div>
          {selectedExam && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>Max: {selectedExam.maxMarks}</div>}
        </div>

        <div className="card stagger-2">
          <div className="stat-label">Moving Average (last 3)</div>
          <div className="stat-value">{overview?.movingAverage?.toFixed(2) || '0.00'}</div>
        </div>

        <div className="card stagger-3">
          <div className="stat-label">Probability</div>
          <div className="stat-value">{overview?.probability || 0}%</div>
          {overview?.probability === 0 && <span className="badge badge-red" style={{ marginTop: '8px' }}>Insufficient data</span>}
        </div>

        <div className="card stagger-4">
          <div className="stat-label">Risk Level</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(244,63,94,0.15)" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none" stroke="var(--red)" strokeWidth="6"
                strokeDasharray="150.8"
                strokeDashoffset={overview?.riskLevel === 'HIGH' ? '37.7' : overview?.riskLevel === 'MEDIUM' ? '75.4' : '113.1'}
                transform="rotate(-90 30 30)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <span className={`badge ${overview?.riskLevel === 'LOW' ? 'badge-green' : overview?.riskLevel === 'MEDIUM' ? 'badge-amber' : 'badge-red'}`}>
              {overview?.riskLevel || 'HIGH'} RISK
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Performance Stability */}
        <div className="card">
          <div className="stat-label">Performance Stability</div>
          <span className="badge badge-amber">{overview?.consistencyScore || 'Insufficient Data'}</span>
        </div>

        {/* Improvement Trend */}
        {improvement && (
          <ImprovementCard improvement={improvement} />
        )}

        {/* Attempt vs Accuracy Insight */}
        {attemptInsight && (
          <AttemptAccuracyCard insight={attemptInsight} />
        )}
      </div>

      {insightsData && insightsData.insights.length > 0 && (
        <InsightsCard insights={insightsData} />
      )}

      {neglectedSubjects.length > 0 && (
        <NeglectCard subjects={neglectedSubjects} windowSize={neglectData?.windowSize ?? 5} />
      )}

      {adaptiveStrength && adaptiveStrength.subjects.length > 0 && (
        <AdaptiveStrengthCard adaptiveStrength={adaptiveStrength} />
      )}

      {!overview?.goalProgress ? (
        <div className="card card-accent" style={{
          background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(124,106,255,0.04))',
          border: '1px solid rgba(124,106,255,0.25)', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Set a Goal</div>
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Track your progress toward a target score</div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingGoal(null); setGoalDialogOpen(true); }}>Create Goal</button>
          </div>
        </div>
      ) : (
        <div className="card card-accent" style={{
          background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(124,106,255,0.04))',
          border: '1px solid rgba(124,106,255,0.25)', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="stat-label">Goal Progress</div>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => {
                const activeGoal = goals.length > 0 ? goals[goals.length - 1] : null;
                if (activeGoal) {
                  setEditingGoal(activeGoal);
                  setGoalDialogOpen(true);
                }
              }}
            >
              ✏️ Edit Goal
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
              {overview.goalProgress.goalProgressPercent.toFixed(1)}% toward {overview.goalProgress.targetScore.toFixed(2)}
            </span>
            <span className={`badge ${overview.goalProgress.onTrack ? 'badge-green' : 'badge-amber'}`}>
              {overview.goalProgress.onTrack ? 'On Track' : 'Needs Focus'}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(overview.goalProgress.goalProgressPercent, 100)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Current Score</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{overview.goalProgress.currentScore.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Days Remaining</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{overview.goalProgress.daysRemaining}</div>
            </div>
          </div>
        </div>
      )}

      <div className="stack-md" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '24px' }}>
        {/* Performance Trend Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title">Performance Trend</h3>
            {selectedExam && <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{selectedExam.name}</span>}
          </div>
          {trendData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No trend data yet</div>
              <div className="empty-sub">Add mock tests to see your trend</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                {overview?.movingAverage && (
                  <ReferenceLine y={mocks?.content?.[0]?.cutoffScore} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'Cutoff', fill: 'var(--red)', fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="score" stroke="var(--accent2)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent2)' }} name="Score" />
                <Line type="monotone" dataKey="avg" stroke="var(--green)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="3-Mock Avg" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Weak Subjects */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-red">Weak Subjects</span>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>&lt;80% accuracy</span>
            </div>
            {overview?.weakSubjects && overview.weakSubjects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {overview.weakSubjects.map((subject) => (
                  <div key={subject.subjectName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>{subject.subjectName}</span>
                    <span className={`badge ${subject.accuracy < 60 ? 'badge-red' : 'badge-amber'}`}>
                      {subject.accuracy.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>✓</div>
                <div style={{ fontSize: '12px', color: 'var(--green)' }}>
                  {overview?.averageScore ? 'All subjects above 80%!' : 'Add mocks to see subject data'}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: '12px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/pyq-tests')}>
                ⏱️ Practice PYQ
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/topic-performance')}>
                🎯 Topic Performance
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/subject-analytics')}>
                📊 Subject Analytics
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/add-mock')}>
                ➕ Log a Mock
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/performance-history')}>
                📋 Mock History
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => downloadReportMutation.mutate()} disabled={downloadReportMutation.isPending}>
                📥 Download Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {latestPyq && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <h3 className="section-title" style={{ marginBottom: 4 }}>Latest PYQ sections</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>
                {latestPyq.paperTitle} · {latestPyq.submittedAt ? new Date(latestPyq.submittedAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-amber">PYQ</span>
              <strong style={{ color: 'var(--accent2)' }}>{latestPyq.totalScore.toFixed(1)}</strong>
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => navigate(`/pyq-analyze/${latestPyq.attemptId}`)}>
                Analyze
              </button>
            </div>
          </div>
          {(latestPyq.sections || []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No section breakdown saved for this attempt.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {latestPyq.sections.map((s) => (
                <div
                  key={s.sectionCode}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface2)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{s.sectionCode}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{s.score.toFixed(1)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                    {s.correct}C / {s.incorrect}I / {s.unattempted}U
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>Recent activity</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>
              PYQ attempts and logged mocks · sources kept separate
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/pyq-tests')}>PYQ Tests</button>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/add-mock')}>Log Mock</button>
          </div>
        </div>
        {recentActivity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No activity yet</div>
            <div className="empty-sub">Take a PYQ paper or log an external mock to start tracking</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/pyq-tests')}>Start PYQ</button>
              <button className="btn" onClick={() => navigate('/add-mock')}>+ Add Mock</button>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <div className="table-header" style={{ gridTemplateColumns: '90px 1.4fr 100px 100px 1fr 110px' }}>
              <div className="th">Source</div>
              <div className="th">Activity</div>
              <div className="th">Date</div>
              <div className="th" style={{ textAlign: 'right' }}>Score</div>
              <div className="th">Detail</div>
              <div className="th" style={{ textAlign: 'center' }}>Actions</div>
            </div>
            {recentActivity.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="table-row" style={{ gridTemplateColumns: '90px 1.4fr 100px 100px 1fr 110px' }}>
                <div>
                  <span className={`badge ${item.kind === 'PYQ' ? 'badge-amber' : 'badge-green'}`}>
                    {item.kind}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.examName}</div>
                </div>
                <div style={{ fontSize: 13 }}>{new Date(item.date).toLocaleDateString()}</div>
                <div style={{ fontSize: 13, textAlign: 'right', fontWeight: 600, color: 'var(--accent2)' }}>
                  {item.score.toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {item.kind === 'PYQ' ? (
                    <>
                      {item.correctCount}C / {item.incorrectCount}I / {item.unattemptedCount}U
                      {item.sections?.length > 0 && (
                        <span style={{ color: 'var(--text3)' }}>
                          {' · '}
                          {item.sections.map((s) => `${s.sectionCode} ${s.score.toFixed(0)}`).join(' · ')}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Cutoff {item.cutoffScore.toFixed(1)}
                      {item.probabilityScore != null ? ` · Prob ${item.probabilityScore}%` : ''}
                    </>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  {item.kind === 'PYQ' ? (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => navigate(`/pyq-analyze/${item.id}`)}
                    >
                      Analyze
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => handleViewMockDetail(item.id)}
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MockDetailDialog open={mockDetailOpen} onClose={() => { setMockDetailOpen(false); setSelectedMockId(null); }} mockDetail={mockDetail} />
      <GoalSettingDialog 
        open={goalDialogOpen} 
        onClose={() => { 
          setGoalDialogOpen(false); 
          setEditingGoal(null); 
        }} 
        existingGoal={editingGoal} 
      />
    </DashboardLayout>
  );
};

function ImprovementCard({ improvement }: { improvement: ImprovementDTO }) {
  const trendBadge =
    improvement.trend === 'IMPROVING' ? 'badge-green' :
    improvement.trend === 'DECLINING' ? 'badge-red' : 'badge-amber';

  const trendLabel =
    improvement.trend === 'IMPROVING' ? '↑ Improving' :
    improvement.trend === 'DECLINING' ? '↓ Declining' : '→ Stable';

  const trendColor =
    improvement.trend === 'IMPROVING' ? 'var(--green)' :
    improvement.trend === 'DECLINING' ? 'var(--red)' : 'var(--text2)';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div className="stat-label" style={{ marginBottom: 0 }}>📈 Performance Trend</div>
        <span className={`badge ${trendBadge}`}>{trendLabel}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: trendColor
        }}>
          {improvement.improvementRate >= 0 ? '+' : ''}{improvement.improvementRate.toFixed(1)}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>points</span>
      </div>
      <div className="stack-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'var(--surface2)', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Last 5</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{improvement.last5Avg.toFixed(1)}</div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Previous 5</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{improvement.prev5Avg.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}

function InsightsCard({ insights }: { insights: InsightsResponse }) {
  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'WARNING': return '⚠️';
      case 'SUCCESS': return '✅';
      case 'INFO': return 'ℹ️';
    }
  };

  const getInsightColor = (type: InsightType) => {
    switch (type) {
      case 'WARNING': return 'var(--red)';
      case 'SUCCESS': return 'var(--green)';
      case 'INFO': return 'var(--accent2)';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px' }}>🧠</span>
        <h3 className="section-title">Insights</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {insights.insights.map((insight, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '10px', 
            padding: '12px', 
            background: 'var(--surface2)', 
            borderRadius: '10px',
            borderLeft: `3px solid ${getInsightColor(insight.type)}`
          }}>
            <span style={{ fontSize: '16px', marginTop: '1px' }}>{getInsightIcon(insight.type)}</span>
            <span style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text)' }}>
              {insight.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdaptiveStrengthCard({ adaptiveStrength }: { adaptiveStrength: AdaptiveStrengthResponse }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WEAK': return 'badge-red';
      case 'BELOW_AVERAGE': return 'badge-amber';
      case 'AVERAGE': return 'badge-purple';
      case 'STRONG': return 'badge-green';
      default: return 'badge-purple';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'WEAK': return 'Weak';
      case 'BELOW_AVERAGE': return 'Below Avg';
      case 'AVERAGE': return 'Average';
      case 'STRONG': return 'Strong';
      default: return 'Average';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="section-title">Subject Strength Analysis</h3>
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
          vs {adaptiveStrength.overallAccuracy.toFixed(1)}% avg
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {adaptiveStrength.subjects.slice(0, 6).map(subject => (
          <div key={subject.subjectName} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '10px 12px', 
            background: 'var(--surface2)', 
            borderRadius: '8px' 
          }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{subject.subjectName}</span>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                {subject.accuracy.toFixed(1)}% accuracy
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '12px', 
                color: subject.relativeScore >= 0 ? 'var(--green)' : 'var(--red)',
                fontWeight: 600
              }}>
                {subject.relativeScore >= 0 ? '+' : ''}{subject.relativeScore.toFixed(1)}%
              </span>
              <span className={`badge ${getStatusBadge(subject.status)}`}>
                {getStatusLabel(subject.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptAccuracyCard({ insight }: { insight: AttemptAccuracyInsightDTO }) {
  const trendBadge =
    insight.trend === 'NEGATIVE' ? 'badge-red' :
    insight.trend === 'POSITIVE' ? 'badge-green' : 'badge-amber';

  const trendLabel =
    insight.trend === 'NEGATIVE' ? '↓ Negative' :
    insight.trend === 'POSITIVE' ? '↑ Positive' : '→ Neutral';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div className="stat-label" style={{ marginBottom: 0 }}>Attempt Strategy</div>
        <span className={`badge ${trendBadge}`}>{trendLabel}</span>
      </div>
      <div className="stack-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>High attempt accuracy</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: insight.highAttemptAccuracy >= insight.lowAttemptAccuracy ? 'var(--green)' : 'var(--red)' }}>
            {insight.highAttemptAccuracy.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>avg {insight.highAttemptAvgRate.toFixed(0)}% attempted</div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>Low attempt accuracy</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: insight.lowAttemptAccuracy >= insight.highAttemptAccuracy ? 'var(--green)' : 'var(--red)' }}>
            {insight.lowAttemptAccuracy.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>avg {insight.lowAttemptAvgRate.toFixed(0)}% attempted</div>
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>{insight.insight}</div>
    </div>
  );
}

function NeglectCard({ subjects, windowSize }: { subjects: SubjectNeglectDTO[]; windowSize: number }) {
  return (
    <div className="card" style={{ marginBottom: '24px', borderColor: 'rgba(244,63,94,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <h3 className="section-title">Neglected Subjects</h3>
        <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: 'auto' }}>last {windowSize} mocks</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {subjects.map(s => (
          <div key={s.subjectName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', background: 'var(--surface2)', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{s.subjectName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                {s.status === 'NEGLECTED'
                  ? `Not attempted in last ${windowSize} mocks`
                  : `Only ${s.appearedInLastN}x in last ${windowSize} mocks`}
              </span>
              <span className={s.status === 'NEGLECTED' ? 'badge badge-red' : 'badge badge-amber'}>
                {s.status === 'NEGLECTED' ? 'Neglected' : 'Partial'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
