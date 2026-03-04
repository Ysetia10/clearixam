import { apiClient } from './client';

export interface SubjectPerformance {
  id: string;
  userId: string;
  examId: string;
  subjectId: string;
  subjectName: string;
  marks: number;
  questionsAttempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  testDate: string;
}

export interface CreatePerformanceRequest {
  examId: string;
  subjectId: string;
  marks: number;
  questionsAttempted: number;
  correct: number;
  incorrect: number;
  testDate: string;
}

export const performanceApi = {
  create: (data: CreatePerformanceRequest) => apiClient.post<SubjectPerformance>('/performance', data),
  getByExam: (examId: string) => apiClient.get<SubjectPerformance[]>(`/performance?examId=${examId}`),
  delete: (id: string) => apiClient.delete<{ message: string }>(`/performance/${id}`),
};
