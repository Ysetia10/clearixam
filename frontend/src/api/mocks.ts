import { apiClient } from './client';

export interface SubjectInput {
  subjectName: string;
  subjectId: string;
  attempted: number;
  correct: number;
}

export interface CreateMockRequest {
  examId: string;
  testDate: string;
  cutoffScore: number;
  subjects: SubjectInput[];
}

export interface MockResponse {
  id: string;
  testName: string;
  examId: string;
  examName: string;
  testDate: string;
  totalScore: number;
  cutoffScore: number;
  probabilityScore: number | null;
  attempted: number;
  correct: number;
  incorrect: number;
  totalQuestions: number;
  marksObtained: number;
}

export interface PagedMockResponse {
  content: MockResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SubjectDetail {
  subjectId: string;
  subjectName: string;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
}

export interface MockDetailResponse {
  id: string;
  testName: string;
  examId: string;
  examName: string;
  testDate: string;
  totalScore: number;
  cutoffScore: number;
  probabilityScore: number | null;
  attempted: number;
  correct: number;
  incorrect: number;
  totalQuestions: number;
  marksObtained: number;
  subjects: SubjectDetail[];
}

export const mocksApi = {
  create: (data: CreateMockRequest) => apiClient.post<MockResponse>('/mocks', data),
  list: (page: number = 0, size: number = 10) => apiClient.get<PagedMockResponse>(`/mocks?page=${page}&size=${size}`),
  getDetail: (id: string) => apiClient.get<MockDetailResponse>(`/mocks/${id}`),
  delete: (id: string) => apiClient.delete<void>(`/mocks/${id}`),
};
