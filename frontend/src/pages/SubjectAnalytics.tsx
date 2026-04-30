import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { analyticsApi, SubjectStatus } from '../api/analytics';
import { examsApi, Exam } from '../api/exams';

type FilterType = 'all' | 'weak' | 'strong';

const STATUS_BADGE: Record<SubjectStatus, string> = {
  IMPROVING: 'badge-green',
  DECLINING: 'badge-red',
  STABLE: 'badge-amber',
};

const STATUS_LABEL: Record<SubjectStatus, string> = {
  IMPROVING: '↑ Improving',
  DECLINING: '↓ Declining',
  STABLE: '→ Stable',
};

export const SubjectAnalytics = () => {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const { data, isLoading } = useQuery({
    queryKey: ['subject-analytics', selectedExamId],
    queryFn: () => analyticsApi.getSubjectAnalytics(selectedExamId || undefined),
    enabled: !!selectedExamId,
    staleTime: 30000,
  });

  const handleFilterChange = useCallback((f: FilterType) => setFilter(f), []);

  const subjects = useMemo(() => {
    const all = data?.subjects ?? [];
    if (filter === 'weak') return all.filter(s => s.avgAccuracy < 80);
    if (filter === 'strong') return all.filter(s => s.avgAccuracy >= 90);
    return all;
  }, [data, filter]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Subject Analytics</h1>
        <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
          Per-subject performance across all your mocks
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs">
          {(['all', 'weak', 'strong'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`tab ${filter === f ? 'active' : ''}`}
              onClick={() => handleFilterChange(f)}
            >
              {f === 'all' ? 'All' : f === 'weak' ? 'Weak (<80%)' : 'Strong (≥90%)'}
            </button>
          ))}
        </div>
        {exams.length > 0 && (
          <select
            className="select"
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
          >
            {exams.map((exam: Exam) => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </select>
        )}
      </div>


      {subjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">
              {filter !== 'all' ? `No ${filter} subjects` : 'No data yet'}
            </div>
            <div className="empty-sub">
              {filter !== 'all'
                ? 'Try switching to "All" to see all subjects'
                : 'Add mock tests to see subject analytics'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {subjects.map((subject, i) => {
            const accuracyColor =
              subject.avgAccuracy >= 90 ? 'var(--green)' :
              subject.avgAccuracy >= 70 ? 'var(--amber)' : 'var(--red)';
            const trendColor = subject.trend >= 0 ? 'var(--green)' : 'var(--red)';
            return (
              <div key={subject.subjectName} className={`card stagger-${Math.min(i + 1, 6)}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700 }}>
                      {subject.subjectName}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                      {subject.totalMocksAttempted} mock{subject.totalMocksAttempted !== 1 ? 's' : ''}
                      {subject.lastAttemptedDate && (
                        <> · last {new Date(subject.lastAttemptedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[subject.status]}`}>
                    {STATUS_LABEL[subject.status]}
                  </span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: accuracyColor, fontFamily: 'Syne, sans-serif', marginBottom: '8px' }}>
                    {subject.avgAccuracy.toFixed(1)}%
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${subject.avgAccuracy}%`, background: `linear-gradient(90deg, ${accuracyColor}, ${accuracyColor}88)` }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Avg Attempts</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{subject.avgAttemptsPerMock.toFixed(1)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Trend (last 5 vs prev 5)</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: trendColor }}>
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
      )}
    </DashboardLayout>
  );
};
