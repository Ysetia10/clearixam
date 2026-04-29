import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { analyticsApi } from '../api/analytics';
import { mocksApi } from '../api/mocks';
import { examsApi, Exam } from '../api/exams';
import { reportsApi } from '../api/reports';
import { GoalSettingDialog } from '../components/GoalSettingDialog';
import { MockDetailDialog } from '../components/MockDetailDialog';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [mockDetailOpen, setMockDetailOpen] = useState(false);

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  // Default to first exam once loaded
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

  const insights = useMemo(() => {
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

  const isLoading = overviewLoading || trendLoading || mocksLoading;

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
      {/* TOPBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>Track your performance and progress</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Exam Selector */}
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
          <button className="btn btn-primary" onClick={() => navigate('/add-mock')}>+ Add Mock</button>
        </div>
      </div>

      {/* INSIGHT BANNER */}
      {insights.length > 0 && (
        <div className={`insight-banner ${insights[0].type === 'success' ? 'insight-banner-green' : 'insight-banner-red'}`} style={{ marginBottom: '24px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: insights[0].type === 'success' ? 'rgba(34,211,160,0.15)' : 'rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            {insights[0].type === 'success' ? '✓' : '⚠'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: insights[0].type === 'success' ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
              {insights[0].message}
            </div>
            {insights[1] && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{insights[1].message}</div>
            )}
          </div>
        </div>
      )}

      {/* STATS GRID */}
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

      {/* MID ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div className="stat-label">Performance Stability</div>
          <span className="badge badge-amber">{overview?.consistencyScore || 'Insufficient Data'}</span>
        </div>
        <div className="card">
          <div className="stat-label">Strategy Note</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
            {overview?.strategyNote || 'Complete more mocks for recommendations'}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Recent Trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 700,
              color: overview && overview.performanceChange >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {overview && overview.performanceChange >= 0 ? '+' : ''}{overview?.performanceChange?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>vs previous 5 mocks</div>
        </div>
      </div>

      {/* GOAL CARD */}
      {!overview?.goalProgress ? (
        <div className="card card-accent" style={{
          background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(124,106,255,0.04))',
          border: '1px solid rgba(124,106,255,0.25)', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Set a Goal</div>
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Track your progress toward a target score</div>
            </div>
            <button className="btn btn-primary" onClick={() => setGoalDialogOpen(true)}>Create Goal</button>
          </div>
        </div>
      ) : (
        <div className="card card-accent" style={{
          background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(124,106,255,0.04))',
          border: '1px solid rgba(124,106,255,0.25)', marginBottom: '24px',
        }}>
          <div className="stat-label">Goal Progress</div>
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

      {/* BOTTOM GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '24px' }}>
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
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/subject-analytics')}>
                📊 Subject Analytics
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

      {/* MOCK HISTORY TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title">Recent Mocks</h3>
        </div>
        {(!mocks?.content || mocks.content.length === 0) ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No mock tests yet</div>
            <div className="empty-sub">Create your first mock test to start tracking</div>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/add-mock')}>+ Add Mock Test</button>
          </div>
        ) : (
          <>
            <div className="table-header" style={{ gridTemplateColumns: '1fr 100px 120px 120px 120px 120px' }}>
              <div className="th">Date</div>
              <div className="th">Exam</div>
              <div className="th" style={{ textAlign: 'right' }}>Score</div>
              <div className="th" style={{ textAlign: 'right' }}>Cutoff</div>
              <div className="th" style={{ textAlign: 'center' }}>Probability</div>
              <div className="th" style={{ textAlign: 'center' }}>Actions</div>
            </div>
            {mocks.content.map((mock) => (
              <div key={mock.id} className="table-row" style={{ gridTemplateColumns: '1fr 100px 120px 120px 120px 120px' }}>
                <div style={{ fontSize: '13px' }}>{new Date(mock.testDate).toLocaleDateString()}</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{mock.examName}</div>
                <div style={{ fontSize: '13px', textAlign: 'right', fontWeight: 600, color: 'var(--accent2)' }}>{mock.totalScore.toFixed(2)}</div>
                <div style={{ fontSize: '13px', textAlign: 'right', color: 'var(--text2)' }}>{mock.cutoffScore.toFixed(2)}</div>
                <div style={{ textAlign: 'center' }}>
                  <span className={`badge ${(mock.probabilityScore || 0) >= 75 ? 'badge-green' : (mock.probabilityScore || 0) >= 50 ? 'badge-amber' : 'badge-red'}`}>
                    {mock.probabilityScore != null ? `${mock.probabilityScore}%` : 'N/A'}
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => handleViewMockDetail(mock.id)}>
                    👁 View
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <MockDetailDialog open={mockDetailOpen} onClose={() => { setMockDetailOpen(false); setSelectedMockId(null); }} mockDetail={mockDetail} />
      <GoalSettingDialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} />
    </DashboardLayout>
  );
};
