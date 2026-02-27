import { apiClient } from './client';

export interface SubjectInput {
  subjectName: string;
  attempted: number;
  correct: number;
  incorrect: number;
}

export interface CreateMockRequest {
  testDate: string;
  cutoffScore: number;
  subjects: SubjectInput[];
}

export interface MockResponse {
  id: string;
  testDate: string;
  totalScore: number;
  cutoffScore: number;
  probabilityScore: number | null;
}

export interface PagedMockResponse {
  content: MockResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const mocksApi = {
  create: (data: CreateMockRequest) =>
    apiClient<MockResponse>('/mocks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (page: number = 0, size: number = 10) =>
    apiClient<PagedMockResponse>(`/mocks?page=${page}&size=${size}`),
};
