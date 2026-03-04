import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examsApi, Exam } from '../api/exams';
import { useToast } from './Toast';

interface ExamSwitcherProps {
  currentExamId?: string;
  onExamChange?: (examId: string) => void;
}

export const ExamSwitcher: React.FC<ExamSwitcherProps> = ({ currentExamId, onExamChange }) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  const setActiveExamMutation = useMutation({
    mutationFn: (examId: string) => examsApi.setActiveExam({ examId }),
    onSuccess: (_, examId) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      showToast('Exam switched successfully', 'success');
      onExamChange?.(examId);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const examId = e.target.value;
    if (examId) {
      setActiveExamMutation.mutate(examId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Loading exams...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="exam-select" className="text-sm font-medium text-gray-700">
        Exam:
      </label>
      <select
        id="exam-select"
        value={currentExamId || ''}
        onChange={handleExamChange}
        disabled={setActiveExamMutation.isPending}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 font-medium"
      >
        <option value="">Select Exam</option>
        {exams.map((exam: Exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.name}
          </option>
        ))}
      </select>
      {setActiveExamMutation.isPending && (
        <span className="text-sm text-gray-500">Switching...</span>
      )}
    </div>
  );
};
