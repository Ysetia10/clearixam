import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { examsApi, Exam } from '../api/exams';
import { mocksApi, MockResponse } from '../api/mocks';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MockDetailDialog } from '../components/MockDetailDialog';

export const PerformanceHistory = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [mockDetailOpen, setMockDetailOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  const { data: mocks, isLoading } = useQuery({
    queryKey: ['mocks', page],
    queryFn: () => mocksApi.list(page, 15),
    staleTime: 30000,
  });

  const { data: mockDetail } = useQuery({
    queryKey: ['mock-detail', selectedMockId],
    queryFn: () => mocksApi.getDetail(selectedMockId!),
    enabled: !!selectedMockId && mockDetailOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: mocksApi.delete,
    onSuccess: () => {
      showToast('Mock test deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['mocks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trend'] });
      setDeleteId(null);
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const handleViewDetail = useCallback((id: string) => {
    setSelectedMockId(id);
    setMockDetailOpen(true);
  }, []);

  const getExamName = useCallback((mock: MockResponse) => {
    return mock.examName || exams.find((e: Exam) => e.id === mock.examId)?.name || '—';
  }, [exams]);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Performance History</h1>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>All your mock tests in one place</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/add-mock')}>+ Add Mock</button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-title">Loading...</div>
          </div>
        ) : !mocks?.content?.length ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No mock tests yet</div>
            <div className="empty-sub">Add your first mock test to start tracking</div>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/add-mock')}>
              + Add Mock Test
            </button>
          </div>
        ) : (
          <>
            <div className="table-header" style={{ gridTemplateColumns: '110px 1fr 110px 110px 100px 110px 110px' }}>
              <div className="th">Date</div>
              <div className="th">Exam</div>
              <div className="th" style={{ textAlign: 'right' }}>Score</div>
              <div className="th" style={{ textAlign: 'right' }}>Cutoff</div>
              <div className="th" style={{ textAlign: 'center' }}>Attempted</div>
              <div className="th" style={{ textAlign: 'center' }}>Probability</div>
              <div className="th" style={{ textAlign: 'center' }}>Actions</div>
            </div>
            {mocks.content.map((mock: MockResponse) => (
              <div key={mock.id} className="table-row" style={{ gridTemplateColumns: '110px 1fr 110px 110px 100px 110px 110px' }}>
                <div style={{ fontSize: '13px' }}>{new Date(mock.testDate).toLocaleDateString()}</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{getExamName(mock)}</div>
                <div style={{ fontSize: '13px', textAlign: 'right', fontWeight: 600, color: 'var(--accent2)' }}>
                  {mock.totalScore.toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', textAlign: 'right', color: 'var(--text2)' }}>
                  {mock.cutoffScore.toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', textAlign: 'center' }}>
                  {mock.attempted ?? '—'}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className={`badge ${
                    (mock.probabilityScore || 0) >= 75 ? 'badge-green' :
                    (mock.probabilityScore || 0) >= 50 ? 'badge-amber' : 'badge-red'
                  }`}>
                    {mock.probabilityScore != null ? `${mock.probabilityScore}%` : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleViewDetail(mock.id)}
                  >
                    👁 View
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--red)' }}
                    onClick={() => setDeleteId(mock.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {mocks.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px' }}>
                <button
                  className="btn btn-ghost"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                  Page {page + 1} of {mocks.totalPages}
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={page >= mocks.totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Mock Test"
        message="Are you sure you want to delete this mock test? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />

      <MockDetailDialog
        open={mockDetailOpen}
        onClose={() => { setMockDetailOpen(false); setSelectedMockId(null); }}
        mockDetail={mockDetail}
      />
    </DashboardLayout>
  );
};
