import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { examsApi } from '../api/exams';
import { performanceApi, CreatePerformanceRequest } from '../api/performance';
import { useToast } from '../components/Toast';

export const AddPerformance: React.FC = () => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'examId' || name === 'subjectId' || name === 'testDate' ? value : Number(value),
    }));

    // Reset subject when exam changes
    if (name === 'examId') {
      setFormData(prev => ({ ...prev, subjectId: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add Subject Performance</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Exam Selection */}
            <div>
              <label htmlFor="examId" className="block text-sm font-medium text-gray-700 mb-2">
                Exam *
              </label>
              <select
                id="examId"
                name="examId"
                value={formData.examId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Exam</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} (Max: {exam.maxMarks} marks, {exam.maxQuestions} questions)
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                id="subjectId"
                name="subjectId"
                value={formData.subjectId}
                onChange={handleChange}
                required
                disabled={!formData.examId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Date */}
            <div>
              <label htmlFor="testDate" className="block text-sm font-medium text-gray-700 mb-2">
                Test Date *
              </label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                value={formData.testDate}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Questions Attempted */}
            <div>
              <label htmlFor="questionsAttempted" className="block text-sm font-medium text-gray-700 mb-2">
                Questions Attempted *
              </label>
              <input
                type="number"
                id="questionsAttempted"
                name="questionsAttempted"
                value={formData.questionsAttempted}
                onChange={handleChange}
                required
                min="0"
                max={selectedExam?.maxQuestions}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Correct Answers */}
            <div>
              <label htmlFor="correct" className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answers *
              </label>
              <input
                type="number"
                id="correct"
                name="correct"
                value={formData.correct}
                onChange={handleChange}
                required
                min="0"
                max={formData.questionsAttempted}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Incorrect Answers */}
            <div>
              <label htmlFor="incorrect" className="block text-sm font-medium text-gray-700 mb-2">
                Incorrect Answers *
              </label>
              <input
                type="number"
                id="incorrect"
                name="incorrect"
                value={formData.incorrect}
                onChange={handleChange}
                required
                min="0"
                max={formData.questionsAttempted}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Marks Obtained */}
            <div>
              <label htmlFor="marks" className="block text-sm font-medium text-gray-700 mb-2">
                Marks Obtained *
              </label>
              <input
                type="number"
                id="marks"
                name="marks"
                value={formData.marks}
                onChange={handleChange}
                required
                min="0"
                max={selectedExam?.maxMarks}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Calculated Accuracy */}
            {formData.questionsAttempted > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Accuracy:</span>{' '}
                  {((formData.correct / formData.questionsAttempted) * 100).toFixed(2)}%
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Performance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
