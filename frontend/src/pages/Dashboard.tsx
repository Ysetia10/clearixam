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
import { DashboardSkeleton } from '../components/Shimmer';
import {
  buildPyqAdaptiveStrength,
  buildPyqAttemptInsight,
  buildPyqImprovement,
  buildPyqInsights,
  buildPyqOverview,
  buildPyqTrend,
} from '../utils/pyqDashboardStats';

type DashboardView = 'mocks' | 'pyqs';

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
  const [viewMode, setViewMode] = useState<DashboardView>('mocks');
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
    queryKey: ['pyq-recent-attempts', selectedExamId, 50],
    queryFn: () => papersApi.listRecentAttempts(selectedExamId || undefined, 50),
    staleTime: 30000,
    enabled: !!selectedExamId,
  });

  const { data: pyqTopics, isLoading: pyqTopicsLoading } = useQuery({
    queryKey: ['pyq-topic-performance', selectedExamId],
    queryFn: () => papersApi.getTopicPerformance(selectedExamId || undefined),
    staleTime: 60000,
    enabled: !!selectedExamId && viewMode === 'pyqs',
  });

  const { data: neglectData } = useQuery({
    queryKey: ['subject-neglect', selectedExamId],
    queryFn: () => analyticsApi.getSubjectNeglect(selectedExamId || undefined),
    enabled: !!selectedExamId && viewMode === 'mocks',
    staleTime: 60000,
  });

  const { data: attemptInsight } = useQuery({
    queryKey: ['attempt-accuracy', selectedExamId],
    queryFn: () => analyticsApi.getAttemptAccuracyInsight(selectedExamId || undefined),
    enabled: !!selectedExamId && viewMode === 'mocks',
    staleTime: 60000,
  });

  const { data: improvement } = useQuery({
    queryKey: ['improvement', selectedExamId],
    queryFn: () => analyticsApi.getImprovement(selectedExamId || undefined),
    enabled: !!selectedExamId && viewMode === 'mocks',
    staleTime: 60000,
  });

  const { data: adaptiveStrength } = useQuery({
    queryKey: ['adaptive-strength', selectedExamId],
    queryFn: () => analyticsApi.getAdaptiveStrength(selectedExamId || undefined),
    enabled: !!selectedExamId && viewMode === 'mocks',
    staleTime: 60000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights', selectedExamId],
    queryFn: () => analyticsApi.getInsights(selectedExamId || undefined),
    enabled: !!selectedExamId && viewMode === 'mocks',
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
  const activeGoal = goals.length > 0 ? goals[goals.length - 1] : null;

  const mockActivity = useMemo<ActivityItem[]>(() => {
    return (mocks?.content || [])
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
      }))
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [mocks, selectedExamId]);

  const pyqActivity = useMemo<ActivityItem[]>(() => {
    return recentPyq
      .map((a) => ({
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
      }))
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [recentPyq]);

  const latestPyq = recentPyq[0] ?? null;
  const topicList = pyqTopics?.topics || [];

  const pyqOverview = useMemo(
    () =>
      buildPyqOverview(recentPyq, topicList, {
        maxMarks: selectedExam?.maxMarks,
        goal: activeGoal
          ? { targetScore: activeGoal.targetScore, targetDate: activeGoal.targetDate }
          : null,
      }),
    [recentPyq, topicList, selectedExam, activeGoal]
  );
  const pyqTrendData = useMemo(() => buildPyqTrend(recentPyq), [recentPyq]);
  const pyqImprovement = useMemo(() => buildPyqImprovement(recentPyq), [recentPyq]);
  const pyqAttemptInsight = useMemo(() => buildPyqAttemptInsight(recentPyq), [recentPyq]);
  const pyqAdaptive = useMemo(() => buildPyqAdaptiveStrength(topicList), [topicList]);
  const pyqInsights = useMemo(
    () => buildPyqInsights(pyqOverview, pyqImprovement),
    [pyqOverview, pyqImprovement]
  );

  const mockTrendData = useMemo(() => {
    if (!trend?.trends) return [];
    return trend.trends.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      score: parseFloat(p.score.toFixed(2)),
      avg: parseFloat(p.movingAverage.toFixed(2)),
    }));
  }, [trend]);

  const mockLegacyInsights = useMemo(() => {
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

  const isMocks = viewMode === 'mocks';
  const displayOverview = isMocks ? overview : pyqOverview;
  const displayTrendData = isMocks ? mockTrendData : pyqTrendData;
  const displayImprovement = isMocks ? improvement : pyqImprovement;
  const displayAttemptInsight = isMocks ? attemptInsight : pyqAttemptInsight;
  const displayAdaptive = isMocks ? adaptiveStrength : pyqAdaptive;
  const displayInsights = isMocks ? insightsData : pyqInsights;
  const displayActivity = isMocks ? mockActivity : pyqActivity;
  const displayLegacyBanner = isMocks
    ? mockLegacyInsights
    : pyqInsights.insights
        .filter((i) => i.type === 'SUCCESS' || i.type === 'WARNING')
        .slice(0, 2)
        .map((i) => ({
          type: i.type === 'SUCCESS' ? ('success' as const) : ('warning' as const),
          message: i.message,
        }));

  const isLoading = isMocks
    ? overviewLoading || trendLoading || mocksLoading
    : pyqLoading || (viewMode === 'pyqs' && pyqTopicsLoading && !pyqTopics);

  if (isLoading && (isMocks ? !overview : recentPyq.length === 0 && pyqLoading)) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  const consistencyLabel =
    displayOverview?.consistencyScore === 'INSUFFICIENT_DATA'
      ? 'Insufficient Data'
      : displayOverview?.consistencyScore || 'Insufficient Data';

  const goalProgress = isMocks ? overview?.goalProgress : pyqOverview.goalProgress;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
            {isMocks ? 'Track mock performance and progress' : 'Track PYQ performance and progress'}
          </p>
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
          {isMocks ? (
            <button className="btn btn-primary" onClick={() => navigate('/add-mock')}>+ Add Mock</button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/pyq-tests')}>PYQ Tests</button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
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

      {displayLegacyBanner.length > 0 && (
        <div className={`insight-banner ${displayLegacyBanner[0].type === 'success' ? 'insight-banner-green' : 'insight-banner-red'}`} style={{ marginBottom: '24px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: displayLegacyBanner[0].type === 'success' ? 'rgba(34,211,160,0.15)' : 'rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            {displayLegacyBanner[0].type === 'success' ? '✓' : '⚠'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: displayLegacyBanner[0].type === 'success' ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
              {displayLegacyBanner[0].message}
            </div>
            {displayLegacyBanner[1] && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{displayLegacyBanner[1].message}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card stagger-1">
          <div className="stat-label">Average Score</div>
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>
            {displayOverview && displayOverview.averageScore > 0 ? (
              displayOverview.averageScore.toFixed(2)
            ) : (
              <span className="badge badge-amber">No data</span>
            )}
          </div>
          {selectedExam && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>Max: {selectedExam.maxMarks}</div>}
        </div>

        <div className="card stagger-2">
          <div className="stat-label">Moving Average (last 3)</div>
          <div className="stat-value">{displayOverview?.movingAverage?.toFixed(2) || '0.00'}</div>
        </div>

        <div className="card stagger-3">
          <div className="stat-label">{isMocks ? 'Probability' : 'Accuracy'}</div>
          <div className="stat-value">
            {isMocks
              ? `${overview?.probability || 0}%`
              : `${(pyqOverview.accuracyPercent || 0).toFixed(1)}%`}
          </div>
          {isMocks && overview?.probability === 0 && (
            <span className="badge badge-red" style={{ marginTop: '8px' }}>Insufficient data</span>
          )}
          {!isMocks && pyqOverview.attemptCount === 0 && (
            <span className="badge badge-amber" style={{ marginTop: '8px' }}>No PYQs yet</span>
          )}
        </div>

        <div className="card stagger-4">
          <div className="stat-label">Risk Level</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(244,63,94,0.15)" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none" stroke="var(--red)" strokeWidth="6"
                strokeDasharray="150.8"
                strokeDashoffset={displayOverview?.riskLevel === 'HIGH' ? '37.7' : displayOverview?.riskLevel === 'MEDIUM' ? '75.4' : '113.1'}
                transform="rotate(-90 30 30)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <span className={`badge ${displayOverview?.riskLevel === 'LOW' ? 'badge-green' : displayOverview?.riskLevel === 'MEDIUM' ? 'badge-amber' : 'badge-red'}`}>
              {displayOverview?.riskLevel || 'HIGH'} RISK
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div className="stat-label">Performance Stability</div>
          <span className="badge badge-amber">{consistencyLabel}</span>
        </div>

        {displayImprovement && <ImprovementCard improvement={displayImprovement} />}
        {displayAttemptInsight && <AttemptAccuracyCard insight={displayAttemptInsight} />}
      </div>

      {displayInsights && displayInsights.insights.length > 0 && (
        <InsightsCard insights={displayInsights} />
      )}

      {isMocks && neglectedSubjects.length > 0 && (
        <NeglectCard subjects={neglectedSubjects} windowSize={neglectData?.windowSize ?? 5} />
      )}

      {displayAdaptive && displayAdaptive.subjects.length > 0 && (
        <AdaptiveStrengthCard adaptiveStrength={displayAdaptive} />
      )}

      {!goalProgress ? (
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
            <div className="stat-label">Goal Progress {isMocks ? '' : '(vs PYQ avg)'}</div>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => {
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
              {goalProgress.goalProgressPercent.toFixed(1)}% toward {goalProgress.targetScore.toFixed(2)}
            </span>
            <span className={`badge ${goalProgress.onTrack ? 'badge-green' : 'badge-amber'}`}>
              {goalProgress.onTrack ? 'On Track' : 'Needs Focus'}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(goalProgress.goalProgressPercent, 100)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Current Score</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{goalProgress.currentScore.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Days Remaining</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{goalProgress.daysRemaining}</div>
            </div>
          </div>
        </div>
      )}

      <div className="stack-md" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title">{isMocks ? 'Performance Trend' : 'PYQ Performance Trend'}</h3>
            {selectedExam && <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{selectedExam.name}</span>}
          </div>
          {displayTrendData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No trend data yet</div>
              <div className="empty-sub">
                {isMocks ? 'Add mock tests to see your trend' : 'Take PYQ papers to see your trend'}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={displayTrendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                {isMocks && overview?.movingAverage && (
                  <ReferenceLine y={mocks?.content?.[0]?.cutoffScore} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'Cutoff', fill: 'var(--red)', fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="score" stroke="var(--accent2)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent2)' }} name="Score" />
                <Line type="monotone" dataKey="avg" stroke="var(--green)" strokeWidth={2} strokeDasharray="5 5" dot={false} name={isMocks ? '3-Mock Avg' : '3-PYQ Avg'} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-red">Weak Subjects</span>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>&lt;80% accuracy</span>
            </div>
            {displayOverview?.weakSubjects && displayOverview.weakSubjects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayOverview.weakSubjects.map((subject) => (
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
                  {displayOverview && displayOverview.averageScore > 0
                    ? 'All subjects above 80%!'
                    : isMocks
                      ? 'Add mocks to see subject data'
                      : 'Take PYQs to see subject data'}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="section-title" style={{ marginBottom: '12px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isMocks ? (
                <>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/add-mock')}>
                    ➕ Log a Mock
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/performance-history')}>
                    📋 Mock History
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/subject-analytics')}>
                    📊 Subject Analytics
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => downloadReportMutation.mutate()} disabled={downloadReportMutation.isPending}>
                    📥 Download Report
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/pyq-tests')}>
                    ⏱️ Practice PYQ
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/topic-performance')}>
                    🎯 Topic Performance
                  </button>
                  {latestPyq && (
                    <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate(`/pyq-analyze/${latestPyq.attemptId}`)}>
                      🔎 Analyze Latest PYQ
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isMocks && latestPyq && (
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
            <h3 className="section-title" style={{ marginBottom: 4 }}>
              {isMocks ? 'Recent mocks' : 'Recent PYQs'}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>
              {isMocks ? 'Logged external mock tests' : 'In-app previous year paper attempts'}
            </p>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            onClick={() => navigate(isMocks ? '/add-mock' : '/pyq-tests')}
          >
            {isMocks ? 'Log Mock' : 'PYQ Tests'}
          </button>
        </div>
        {displayActivity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">{isMocks ? 'No mocks yet' : 'No PYQs yet'}</div>
            <div className="empty-sub">
              {isMocks ? 'Log an external mock to start tracking' : 'Take a PYQ paper to start tracking'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(isMocks ? '/add-mock' : '/pyq-tests')}
              >
                {isMocks ? '+ Add Mock' : 'Start PYQ'}
              </button>
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
            {displayActivity.map((item) => (
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
