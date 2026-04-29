import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { performanceApi, SubjectPerformance } from '../api/performance';
import { examsApi, Exam } from '../api/exams';

type FilterType = 'all' | 'weak' | 'strong';

export const SubjectAnalytics = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  const { data: performances = [], isLoading: performancesLoading } = useQuery({
    queryKey: ['performance', selectedExamId],
    queryFn: () => performanceApi.getByExam(selectedExamId),
    enabled: !!selectedExamId,
  });

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const handleExamChange = useCallback((examId: string) => {
    setSelectedExamId(examId);
  }, []);

  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
  }, []);

  const subjectStats = useMemo(() => {
    const subjectAnalytics = performances.reduce((acc: Record<string, SubjectPerformance[]>, perf) => {
      if (!acc[perf.subjectName]) {
        acc[perf.subjectName] = [];
      }
      acc[perf.subjectName].push(perf);
      return acc;
    }, {});

    const stats = Object.entries(subjectAnalytics).map(([subjectName, perfs]) => {
      const sortedPerfs = perfs.sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
      
      const avgMarks = perfs.reduce((sum, p) => sum + p.marks, 0) / perfs.length;
      const avgAccuracy = perfs.reduce((sum, p) => sum + p.accuracy, 0) / perfs.length;
      
      let improvementRate = 0;
      if (sortedPerfs.length >= 2) {
        const oldest = sortedPerfs[0].marks;
        const latest = sortedPerfs[sortedPerfs.length - 1].marks;
        if (oldest !== 0) {
          improvementRate = ((latest - oldest) / oldest) * 100;
        }
      }

      return {
        subjectName,
        avgMarks,
        avgAccuracy,
        improvementRate,
        testCount: perfs.length,
      };
    });

    stats.sort((a, b) => b.avgMarks - a.avgMarks);

    if (filter === 'weak') {
      return stats.filter(s => s.avgAccuracy < 80);
    } else if (filter === 'strong') {
      return stats.filter(s => s.avgAccuracy >= 90);
    }
    return stats;
  }, [performances, filter]);

  const isLoading = examsLoading || performancesLoading;

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
      {/* TOPBAR */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Subject Analytics</h1>
        <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
          Detailed performance breakdown by subject
        </p>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs">
          <button
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All Subjects
          </button>
          <button
            className={`tab ${filter === 'weak' ? 'active' : ''}`}
            onClick={() => handleFilterChange('weak')}
          >
            Weak (&lt;80%)
          </button>
          <button
            className={`tab ${filter === 'strong' ? 'active' : ''}`}
            onClick={() => handleFilterChange('strong')}
          >
            Strong (≥90%)
          </button>
        </div>

        {exams.length > 0 && (
          <select
            className="select"
            value={selectedExamId}
            onChange={(e) => handleExamChange(e.target.value)}
          >
            {exams.map((exam: Exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SUBJECT CARDS GRID */}
      {subjectStats.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No subjects found</div>
            <div className="empty-sub">
              {filter !== 'all' 
                ? `No ${filter} subjects in this category`
                : 'Add performance data to see subject analytics'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {subjectStats.map((subject, index) => (
            <div key={subject.subjectName} className={`card stagger-${Math.min(index + 1, 6)}`}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                  {subject.subjectName}
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                  {subject.testCount} test{subject.testCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: 'Syne, sans-serif',
                  marginBottom: '8px',
                }}>
                  {subject.avgAccuracy.toFixed(1)}%
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${subject.avgAccuracy}%` }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Avg Marks</div>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>{subject.avgMarks.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Trend</div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: subject.improvementRate >= 0 ? 'var(--green)' : 'var(--red)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {subject.improvementRate >= 0 ? '↑' : '↓'}
                    {Math.abs(subject.improvementRate).toFixed(1)}%
                  </div>
                </div>
              </div>

              <span className={`badge ${
                subject.avgAccuracy >= 90 ? 'badge-green' :
                subject.avgAccuracy >= 80 ? 'badge-amber' : 'badge-red'
              }`}>
                {subject.avgAccuracy >= 90 ? 'Strong' :
                 subject.avgAccuracy >= 80 ? 'Average' : 'Needs Focus'}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};
