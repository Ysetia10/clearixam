import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { examsApi } from '../api/exams';
import { performanceApi, CreatePerformanceRequest } from '../api/performance';
import { useToast } from '../components/Toast';

export const AddPerformance = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreatePerformanceRequest>({
    examId: '',
    subjectId: '',
    marks: 0,
    questionsAttempted: 0,
    correct: 0,
    incorrect: 0,
    testDate: new Date().toISOString().split('T')[0],
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', formData.examId],
    queryFn: () => examsApi.getSubjects(formData.examId),
    enabled: !!formData.examId,
  });

  const selectedExam = exams.find(e => e.id === formData.examId);

  const createMutation = useMutation({
    mutationFn: performanceApi.create,
    onSuccess: () => {
      showToast('Performance recorded successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.examId) {
      showToast('Please select an exam', 'error');
      return;
    }

    if (!formData.subjectId) {
      showToast('Please select a subject', 'error');
      return;
    }

    if (formData.correct + formData.incorrect > formData.questionsAttempted) {
      showToast('Correct + Incorrect cannot exceed questions attempted', 'error');
      return;
    }

    if (selectedExam && formData.questionsAttempted > selectedExam.maxQuestions) {
      showToast(`Questions attempted cannot exceed ${selectedExam.maxQuestions}`, 'error');
      return;
    }

    if (selectedExam && formData.marks > selectedExam.maxMarks) {
      showToast(`Marks cannot exceed ${selectedExam.maxMarks}`, 'error');
      return;
    }

    createMutation.mutate(formData);
  }, [formData, selectedExam, createMutation, showToast]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'examId' || name === 'subjectId' || name === 'testDate' ? value : Number(value),
    }));

    if (name === 'examId') {
      setFormData(prev => ({ ...prev, subjectId: '' }));
    }
  }, []);

  const accuracy = formData.questionsAttempted > 0 
    ? ((formData.correct / formData.questionsAttempted) * 100).toFixed(2)
    : '0.00';

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className="page-title">Add Subject Performance</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Exam *</label>
              <select
                name="examId"
                value={formData.examId}
                onChange={handleChange}
                required
                className="select"
              >
                <option value="">Select Exam</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} (Max: {exam.maxMarks} marks, {exam.maxQuestions} questions)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Subject *</label>
              <select
                name="subjectId"
                value={formData.subjectId}
                onChange={handleChange}
                required
                disabled={!formData.examId}
                className="select"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Test Date *</label>
              <input
                type="date"
                name="testDate"
                value={formData.testDate}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="input-label">Questions Attempted *</label>
                <input
                  type="number"
                  name="questionsAttempted"
                  value={formData.questionsAttempted}
                  onChange={handleChange}
                  required
                  min="0"
                  max={selectedExam?.maxQuestions}
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Marks Obtained *</label>
                <input
                  type="number"
                  name="marks"
                  value={formData.marks}
                  onChange={handleChange}
                  required
                  min="0"
                  max={selectedExam?.maxMarks}
                  step="0.01"
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Correct Answers *</label>
                <input
                  type="number"
                  name="correct"
                  value={formData.correct}
                  onChange={handleChange}
                  required
                  min="0"
                  max={formData.questionsAttempted}
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Incorrect Answers *</label>
                <input
                  type="number"
                  name="incorrect"
                  value={formData.incorrect}
                  onChange={handleChange}
                  required
                  min="0"
                  max={formData.questionsAttempted}
                  className="input"
                />
              </div>
            </div>

            {formData.questionsAttempted > 0 && (
              <div style={{
                padding: '16px',
                background: 'rgba(124,106,255,0.08)',
                border: '1px solid rgba(124,106,255,0.2)',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <div className="stat-label">Calculated Accuracy</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent2)' }}>
                  {accuracy}%
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/dashboard')}
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving...' : 'Save Performance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};
