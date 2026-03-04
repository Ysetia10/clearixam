import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { examsApi } from '../api/exams';
import { performanceApi, SubjectPerformance } from '../api/performance';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const PerformanceHistory = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  const { data: performances = [], isLoading } = useQuery({
    queryKey: ['performance', selectedExamId],
    queryFn: () => performanceApi.getByExam(selectedExamId),
    enabled: !!selectedExamId,
  });

  const deleteMutation = useMutation({
    mutationFn: performanceApi.delete,
    onSuccess: () => {
      showToast('Performance record deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="page-title">Performance History</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/add-performance')}>
            + Add Performance
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
        </div>
      </div>

      {/* Exam Filter */}
      <div style={{ marginBottom: '24px' }}>
        <label className="input-label">Filter by Exam</label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="select"
          style={{ maxWidth: '300px' }}
        >
          {exams.map(exam => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
      </div>

      {/* Performance List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-title">Loading performances...</div>
          </div>
        ) : performances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No performance records found</div>
            <div className="empty-sub">Add your first performance record for this exam</div>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/add-performance')}>
              + Add Performance
            </button>
          </div>
        ) : (
          <>
            <div className="table-header" style={{ gridTemplateColumns: '120px 1fr 100px 100px 80px 80px 100px 100px' }}>
              <div className="th">Date</div>
              <div className="th">Subject</div>
              <div className="th" style={{ textAlign: 'right' }}>Marks</div>
              <div className="th" style={{ textAlign: 'center' }}>Questions</div>
              <div className="th" style={{ textAlign: 'center' }}>Correct</div>
              <div className="th" style={{ textAlign: 'center' }}>Incorrect</div>
              <div className="th" style={{ textAlign: 'center' }}>Accuracy</div>
              <div className="th" style={{ textAlign: 'center' }}>Actions</div>
            </div>
            {performances.map((perf: SubjectPerformance) => (
              <div key={perf.id} className="table-row" style={{ gridTemplateColumns: '120px 1fr 100px 100px 80px 80px 100px 100px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {new Date(perf.testDate).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
                  {perf.subjectName}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', textAlign: 'right', fontWeight: 600 }}>
                  {perf.marks.toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', textAlign: 'center' }}>
                  {perf.questionsAttempted}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--green)', textAlign: 'center', fontWeight: 600 }}>
                  {perf.correct}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--red)', textAlign: 'center', fontWeight: 600 }}>
                  {perf.incorrect}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className={`badge ${
                    perf.accuracy >= 75 ? 'badge-green' :
                    perf.accuracy >= 60 ? 'badge-amber' : 'badge-red'
                  }`}>
                    {perf.accuracy.toFixed(2)}%
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--red)' }}
                    onClick={() => setDeleteId(perf.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Performance Record"
        message="Are you sure you want to delete this performance record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </DashboardLayout>
  );
};
