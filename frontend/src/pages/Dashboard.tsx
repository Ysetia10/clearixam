import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { analyticsApi } from '../api/analytics';
import { mocksApi } from '../api/mocks';
import { reportsApi } from '../api/reports';
import { GoalSettingDialog } from '../components/GoalSettingDialog';
import { MockDetailDialog } from '../components/MockDetailDialog';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [mockDetailOpen, setMockDetailOpen] = useState(false);
  const [currentExamId, setCurrentExamId] = useState<string>('');

  const downloadReportMutation = useMutation({
    mutationFn: reportsApi.downloadPerformanceReport,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `Clearixam_Report_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsApi.getOverview,
    staleTime: 30000,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: analyticsApi.getTrend,
    staleTime: 30000,
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

  const handleCloseMockDetail = useCallback(() => {
    setMockDetailOpen(false);
    setSelectedMockId(null);
  }, []);

  const handleOpenGoalDialog = useCallback(() => {
    setGoalDialogOpen(true);
  }, []);

  const handleCloseGoalDialog = useCallback(() => {
    setGoalDialogOpen(false);
  }, []);

  const insights = useMemo(() => {
    if (!overview) return [];
    
    const insightList = [];

    if (overview.performanceChange !== undefined) {
      if (overview.performanceChange > 3) {
        insightList.push({
          type: 'success' as const,
          message: `Performance improving steadily (+${overview.performanceChange.toFixed(1)}% from last cycle)`,
        });
      } else if (overview.performanceChange < -3) {
        insightList.push({
          type: 'warning' as const,
          message: `Performance declined ${overview.performanceChange.toFixed(1)}% recently. Review weak subjects.`,
        });
      }
    }

    if (overview.weakSubjects && overview.weakSubjects.length > 0) {
      const weakestSubject = overview.weakSubjects[0];
      insightList.push({
        type: 'warning' as const,
        message: `${weakestSubject.subjectName} accuracy at ${weakestSubject.accuracy.toFixed(1)}%. Focus needed.`,
      });
    }

    if (!overview.weakSubjects || overview.weakSubjects.length === 0) {
      insightList.push({
        type: 'success' as const,
        message: 'No weak subjects detected. Great job maintaining strong performance!',
      });
    }

    return insightList.slice(0, 2);
  }, [overview]);

  const isLoading = overviewLoading || trendLoading || mocksLoading;

  if (isLoading) {
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
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
            Track your performance and progress
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/add-performance')}>
            + Add Performance
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/add-mock')}>
            + Add Mock
          </button>
        </div>
      </div>

      {/* INSIGHT BANNER */}
      {insights.length > 0 && insights[0].type === 'success' && (
        <div className="insight-banner insight-banner-green" style={{ marginBottom: '24px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(34,211,160,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            ✓
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: 'var(--green)', fontWeight: 500 }}>
              {insights[0].message}
            </div>
            {insights[1] && (
              <div style={{ fontSize: '12px', color: 'rgba(34,211,160,0.6)', marginTop: '2px' }}>
                {insights[1].message}
              </div>
            )}
          </div>
        </div>
      )}

      {insights.length > 0 && insights[0].type === 'warning' && (
        <div className="insight-banner insight-banner-red" style={{ marginBottom: '24px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(244,63,94,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            ⚠
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: 'var(--red)', fontWeight: 500 }}>
              {insights[0].message}
            </div>
            {insights[1] && (
              <div style={{ fontSize: '12px', color: 'rgba(244,63,94,0.6)', marginTop: '2px' }}>
                {insights[1].message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Average Score */}
        <div className="card stagger-1">
          <div className="stat-label">Average Score</div>
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>
            {overview?.averageScore ? overview.averageScore.toFixed(2) : (
              <span className="badge badge-amber">No data</span>
            )}
          </div>
        </div>

        {/* Moving Average */}
        <div className="card stagger-2">
          <div className="stat-label">Moving Average</div>
          <div className="stat-value" style={{ color: 'var(--text)' }}>
            {overview?.movingAverage?.toFixed(2) || '0.00'}
          </div>
          {/* Sparkline */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px', marginTop: '12px' }}>
            {[40, 60, 55, 70, 65, 80, 75, 85].map((height, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${height}%`,
                  background: 'var(--surface3)',
                  borderRadius: '3px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Probability */}
        <div className="card stagger-3">
          <div className="stat-label">Probability</div>
          <div className="stat-value" style={{ color: 'var(--text)' }}>
            {overview?.probability || 0}%
          </div>
          {overview?.probability === 0 && (
            <span className="badge badge-red" style={{ marginTop: '8px' }}>Insufficient data</span>
          )}
        </div>

        {/* Risk Level */}
        <div className="card stagger-4">
          <div className="stat-label">Risk Level</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="rgba(244,63,94,0.15)"
                strokeWidth="6"
              />
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="var(--red)"
                strokeWidth="6"
                strokeDasharray="150.8"
                strokeDashoffset={overview?.riskLevel === 'HIGH' ? '37.7' : overview?.riskLevel === 'MEDIUM' ? '75.4' : '113.1'}
                transform="rotate(-90 30 30)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <span className="badge badge-red">{overview?.riskLevel || 'HIGH'} RISK</span>
          </div>
        </div>
      </div>

      {/* MID ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div className="stat-label">Performance Stability</div>
          <span className="badge badge-amber">
            {overview?.consistencyScore || 'Insufficient Data'}
          </span>
        </div>

        <div className="card">
          <div className="stat-label">Attempt Strategy</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
            {overview?.recommendedAttemptRange || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
            {overview?.strategyNote || 'Complete more mocks for recommendations'}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Recent Trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '28px',
              fontWeight: 700,
              color: overview && overview.performanceChange >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {overview && overview.performanceChange >= 0 ? '+' : ''}
              {overview?.performanceChange?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
            vs previous 5 mocks
          </div>
        </div>
      </div>

      {/* GOAL CARD */}
      {!overview?.goalProgress && (
        <div className="card card-accent" style={{
          background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(124,106,255,0.04))',
          border: '1px solid rgba(124,106,255,0.25)',
          marginBottom: '24px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(124,106,255,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                Set a Goal
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
                Track your progress toward a target score
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleOpenGoalDialog}>
              Create Goal
            </button>
          </div>
        </div>
      )}

      {overview?.goalProgress && (
        <div className="card card-accent" style={{
          background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(124,106,255,0.04))',
          border: '1px solid rgba(124,106,255,0.25)',
          marginBottom: '24px',
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
            <div
              className="progress-fill"
              style={{ width: `${Math.min(overview.goalProgress.goalProgressPercent, 100)}%` }}
            />
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
          </div>
          {(!trend?.trends || trend.trends.length === 0) ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No trend data available</div>
              <div className="empty-sub">Add more mock tests to see your performance trend</div>
            </div>
          ) : (
            <div style={{ height: '240px', border: '2px dashed var(--border2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
                <div style={{ fontSize: '12px' }}>Chart visualization</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Weak Subjects */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-green">Weak Subjects</span>
            </div>
            {overview?.weakSubjects && overview.weakSubjects.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {overview.weakSubjects.map((subject) => (
                  <span key={subject.subjectName} className="badge badge-red">
                    {subject.subjectName} ({subject.accuracy.toFixed(1)}%)
                  </span>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                background: 'rgba(34,211,160,0.08)',
                border: '1px solid rgba(34,211,160,0.2)',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>✓</div>
                <div style={{ fontSize: '12px', color: 'var(--green)' }}>
                  No weak subjects detected!
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: '12px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/subject-analytics')}>
                📊 View Subject Analytics
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/performance-history')}>
                📋 Performance History
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => downloadReportMutation.mutate()}
                disabled={downloadReportMutation.isPending}
              >
                📥 Download Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOCK HISTORY TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title">Mock History</h3>
        </div>
        {(!mocks?.content || mocks.content.length === 0) ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No mock tests yet</div>
            <div className="empty-sub">Create your first mock test to start tracking</div>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/add-mock')}>
              + Add Mock Test
            </button>
          </div>
        ) : (
          <>
            <div className="table-header" style={{ gridTemplateColumns: '1fr 120px 120px 120px 120px' }}>
              <div className="th">Date</div>
              <div className="th" style={{ textAlign: 'right' }}>Total Score</div>
              <div className="th" style={{ textAlign: 'right' }}>Cutoff</div>
              <div className="th" style={{ textAlign: 'center' }}>Probability</div>
              <div className="th" style={{ textAlign: 'center' }}>Actions</div>
            </div>
            {mocks.content.map((mock) => (
              <div key={mock.id} className="table-row" style={{ gridTemplateColumns: '1fr 120px 120px 120px 120px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>{mock.testDate}</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', textAlign: 'right', fontWeight: 600 }}>
                  {mock.totalScore.toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'right' }}>
                  {mock.cutoffScore.toFixed(2)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className={`badge ${
                    (mock.probabilityScore || 0) >= 75 ? 'badge-green' :
                    (mock.probabilityScore || 0) >= 50 ? 'badge-amber' : 'badge-red'
                  }`}>
                    {mock.probabilityScore ? `${mock.probabilityScore}%` : 'N/A'}
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => handleViewMockDetail(mock.id)}
                  >
                    👁 View
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <MockDetailDialog
        open={mockDetailOpen}
        onClose={handleCloseMockDetail}
        mockDetail={mockDetail}
      />

      <GoalSettingDialog
        open={goalDialogOpen}
        onClose={handleCloseGoalDialog}
      />
    </DashboardLayout>
  );
};
