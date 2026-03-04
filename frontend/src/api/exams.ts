import { apiClient } from './client';

export interface Exam {
  id: string;
  name: string;
  description: string;
  maxMarks: number;
  maxQuestions: number;
}

export interface Subject {
  id: string;
  name: string;
  examId: string;
  examName: string;
}

export interface CreateSubjectRequest {
  name: string;
  examId: string;
}

export interface SetActiveExamRequest {
  examId: string;
}

export const examsApi = {
  getAll: () => apiClient.get<Exam[]>('/exams'),
  getById: (id: string) => apiClient.get<Exam>(`/exams/${id}`),
  getSubjects: (examId: string) => apiClient.get<Subject[]>(`/subjects?examId=${examId}`),
  createSubject: (data: CreateSubjectRequest) => apiClient.post<Subject>('/subjects', data),
  deleteSubject: (id: string) => apiClient.delete<{ message: string }>(`/subjects/${id}`),
  setActiveExam: (data: SetActiveExamRequest) => apiClient.put<{ message: string }>('/users/active-exam', data),
};
