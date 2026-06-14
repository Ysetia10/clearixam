import { apiClient } from './client';

export interface CreateSectionalTestRequest {
  examId: string;
  subjectId: string;
  testDate: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  timeTakenMinutes: number;
}

export interface SectionalTestResponse {
  id: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  testDate: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  timeTakenMinutes: number;
  score: number;
  accuracy: number;
  secondsPerQuestion: number | null;
  correctMarks: number;
  negativeMarks: number;
}

export interface SectionalHistoryPoint {
  id: string;
  testDate: string;
  score: number;
  accuracy: number;
  secondsPerQuestion: number | null;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  totalQuestions: number;
  timeTakenMinutes: number;
}

export interface SectionalSubjectSummary {
  subjectId: string;
  subjectName: string;
  totalEntries: number;
  latestScore: number;
  latestAccuracy: number;
  latestSecondsPerQuestion: number | null;
  bestScore: number;
  avgAccuracy: number;
  scoreTrend: number;
  speedTrend: number | null;
  history: SectionalHistoryPoint[];
}

export interface SectionalAnalyticsResponse {
  examId: string;
  examName: string;
  subjects: SectionalSubjectSummary[];
}

export const sectionalTestsApi = {
  create: (data: CreateSectionalTestRequest) =>
    apiClient.post<SectionalTestResponse>('/sectional-tests', data),

  listByExam: (examId: string) =>
    apiClient.get<SectionalTestResponse[]>(`/sectional-tests?examId=${examId}`),

  getAnalytics: (examId: string) =>
    apiClient.get<SectionalAnalyticsResponse>(`/sectional-tests/analytics?examId=${examId}`),

  delete: (id: string) =>
    apiClient.delete<void>(`/sectional-tests/${id}`),
};
