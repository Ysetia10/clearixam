import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mocksApi } from '../api/mocks';
import { examsApi, Exam, Subject } from '../api/exams';
import { useToast } from '../components/Toast';

interface SubjectRow {
  id: string;
  subjectId: string;
  subjectName: string;
  attempted: number;
  correct: number;
}

export const AddMock = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [testDate, setTestDate] = useState('');
  const [cutoffScore, setCutoffScore] = useState('');
  const [maxQuestions, setMaxQuestions] = useState<number>(100);
  const [maxMarks, setMaxMarks] = useState<number>(200);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const [error, setError] = useState('');

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  const { data: examSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', selectedExamId],
    queryFn: () => examsApi.getSubjects(selectedExamId),
    enabled: !!selectedExamId,
  });

  const selectedExam = exams.find((e: Exam) => e.id === selectedExamId);

  useEffect(() => {
    if (selectedExam) {
      setMaxQuestions(selectedExam.maxQuestions);
      setMaxMarks(selectedExam.maxMarks);
      
      if (examSubjects.length > 0) {
        const initialRows = examSubjects.slice(0, 3).map((subject: Subject) => ({
          id: Math.random().toString(36).substr(2, 9),
          subjectId: subject.id,
          subjectName: subject.name,
          attempted: 0,
          correct: 0,
        }));
        setSubjectRows(initialRows);
      }
    }
  }, [selectedExam, examSubjects]);

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const mutation = useMutation({
    mutationFn: mocksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trend'] });
      queryClient.invalidateQueries({ queryKey: ['examReadiness'] });
      showToast('Mock test created successfully', 'success');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to create mock test';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    },
  });

  const calculateScore = useCallback((attempted: number, correct: number) => {
    const incorrect = attempted - correct;
    return (correct * 2 - incorrect * 0.66).toFixed(2);
  }, []);

  const calculateTotalScore = useCallback(() => {
    return subjectRows.reduce((sum, row) => {
      const score = parseFloat(calculateScore(row.attempted, row.correct));
      return sum + score;
    }, 0).toFixed(2);
  }, [subjectRows, calculateScore]);

  const calculateTotalAttempted = useCallback(() => {
    return subjectRows.reduce((sum, row) => sum + row.attempted, 0);
  }, [subjectRows]);

  const handleSubjectChange = useCallback((id: string, field: keyof SubjectRow, value: any) => {
    setSubjectRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  }, []);

  const handleAddSubject = useCallback(() => {
    if (examSubjects.length === 0) {
      showToast('No subjects available to add', 'error');
      return;
    }

    const usedSubjectIds = new Set(subjectRows.map(r => r.subjectId));
    const availableSubject = examSubjects.find((s: Subject) => !usedSubjectIds.has(s.id));

    if (!availableSubject) {
      showToast('All subjects have been added', 'info');
      return;
    }

    const newRow: SubjectRow = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: availableSubject.id,
      subjectName: availableSubject.name,
      attempted: 0,
      correct: 0,
    };

    setSubjectRows(prev => [...prev, newRow]);
  }, [examSubjects, subjectRows, showToast]);

  const handleRemoveSubject = useCallback((id: string) => {
    if (subjectRows.length === 1) {
      showToast('At least one subject is required', 'error');
      return;
    }
    setSubjectRows(prev => prev.filter(row => row.id !== id));
  }, [subjectRows.length, showToast]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedExamId) {
      setError('Please select an exam');
      return;
    }

    const subjectList = subjectRows
      .filter(row => row.attempted > 0 || row.correct > 0)
      .map(row => ({
        subjectName: row.subjectName,
        subjectId: row.subjectId,
        attempted: row.attempted,
        correct: row.correct,
      }));

    if (subjectList.length === 0) {
      setError('Please add at least one subject with data');
      return;
    }

    const totalAttempted = calculateTotalAttempted();
    if (totalAttempted > maxQuestions) {
      setError(`Total questions attempted (${totalAttempted}) cannot exceed max questions (${maxQuestions})`);
      return;
    }

    for (const subject of subjectList) {
      if (subject.correct > subject.attempted) {
        setError(`Invalid data for ${subject.subjectName}: correct cannot exceed attempted`);
        return;
      }
    }

    const totalScore = parseFloat(calculateTotalScore());
    if (totalScore > maxMarks) {
      setError(`Total score (${totalScore}) cannot exceed max marks (${maxMarks})`);
      return;
    }

    mutation.mutate({
      testDate,
      cutoffScore: parseFloat(cutoffScore),
      subjects: subjectList,
    });
  }, [selectedExamId, subjectRows, testDate, cutoffScore, maxQuestions, maxMarks, calculateTotalAttempted, calculateTotalScore, mutation]);

  if (examsLoading) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalAttempted = calculateTotalAttempted();
  const unattempted = maxQuestions - totalAttempted;
  const totalScore = calculateTotalScore();

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="page-title" style={{ marginBottom: '24px' }}>Add Mock Test</h1>

        <div className="card">
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: '8px',
              color: 'var(--red)',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Exam Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Exam</label>
              <select
                className="select"
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setSubjectRows([]);
                  setError('');
                }}
              >
                {exams.map((exam: Exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }} />

            {/* Test Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="input-label">Test Date</label>
                <input
                  type="date"
                  className="input"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="input-label">Cutoff Score</label>
                <input
                  type="number"
                  className="input"
                  value={cutoffScore}
                  onChange={(e) => setCutoffScore(e.target.value)}
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="input-label">Max Questions</label>
                <input
                  type="number"
                  className="input"
                  value={maxQuestions}
                  onChange={(e) => setMaxQuestions(parseInt(e.target.value) || 0)}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="input-label">Max Marks</label>
                <input
                  type="number"
                  className="input"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseInt(e.target.value) || 0)}
                  required
                  min="1"
                />
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }} />

            {/* Subjects Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="section-title">Subjects</h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleAddSubject}
                  disabled={subjectRows.length >= examSubjects.length}
                >
                  + Add Subject
                </button>
              </div>

              {subjectsLoading ? (
                <div className="empty-state">
                  <div className="empty-icon">⏳</div>
                  <div className="empty-title">Loading subjects...</div>
                </div>
              ) : examSubjects.length === 0 ? (
                <div style={{
                  padding: '16px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--amber)',
                  fontSize: '13px',
                }}>
                  No subjects found for this exam. Please add subjects first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {subjectRows.map((row) => {
                    const usedSubjectIds = new Set(subjectRows.map(r => r.subjectId));
                    const availableSubjects = examSubjects.filter((s: Subject) => 
                      s.id === row.subjectId || !usedSubjectIds.has(s.id)
                    );

                    return (
                      <div key={row.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                        gap: '12px',
                        alignItems: 'end',
                        padding: '12px',
                        background: 'var(--surface2)',
                        borderRadius: '8px',
                      }}>
                        <div>
                          <label className="input-label">Subject</label>
                          <select
                            className="select"
                            value={row.subjectId}
                            onChange={(e) => {
                              const subject = examSubjects.find((s: Subject) => s.id === e.target.value);
                              if (subject) {
                                handleSubjectChange(row.id, 'subjectId', subject.id);
                                handleSubjectChange(row.id, 'subjectName', subject.name);
                              }
                            }}
                          >
                            {availableSubjects.map((subject: Subject) => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="input-label">Attempted</label>
                          <input
                            type="number"
                            className="input"
                            value={row.attempted || ''}
                            onChange={(e) => handleSubjectChange(row.id, 'attempted', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="input-label">Correct</label>
                          <input
                            type="number"
                            className="input"
                            value={row.correct || ''}
                            onChange={(e) => handleSubjectChange(row.id, 'correct', parseInt(e.target.value) || 0)}
                            min="0"
                            max={row.attempted}
                          />
                        </div>
                        <div>
                          <label className="input-label">Score</label>
                          <div style={{
                            padding: '10px 14px',
                            background: 'var(--surface3)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--accent2)',
                          }}>
                            {calculateScore(row.attempted, row.correct)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleRemoveSubject(row.id)}
                          disabled={subjectRows.length === 1}
                          style={{ padding: '10px', color: 'var(--red)' }}
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            {subjectRows.length > 0 && (
              <>
                <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }} />
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--surface2)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}>
                  <div>
                    <div className="stat-label">Total Attempted</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{totalAttempted}</div>
                  </div>
                  <div>
                    <div className="stat-label">Unattempted</div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: unattempted < 0 ? 'var(--red)' : 'var(--text)',
                    }}>
                      {unattempted}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Total Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent2)' }}>{totalScore}</div>
                  </div>
                  <div>
                    <div className="stat-label">Max Questions</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{maxQuestions}</div>
                  </div>
                  <div>
                    <div className="stat-label">Max Marks</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{maxMarks}</div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/dashboard')}
                disabled={mutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={mutation.isPending || examSubjects.length === 0 || subjectRows.length === 0}
              >
                {mutation.isPending ? 'Creating...' : 'Create Mock Test'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};
