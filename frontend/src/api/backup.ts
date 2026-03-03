import { apiClient } from './client';

export interface BackupData {
  exportDate: string;
  user: {
    email: string;
  };
  mocks: Array<{
    id: string;
    testDate: string;
    cutoffScore: number;
    totalScore: number;
    subjects: Array<{
      subjectName: string;
      attempted: number;
      correct: number;
      incorrect: number;
      score: number;
    }>;
  }>;
  goals: Array<{
    id: string;
    targetScore: number;
    targetDate: string;
    createdAt: string;
  }>;
}

export interface ImportRequest {
  overwriteExisting: boolean;
  mocks: Array<{
    id?: string;
    testDate: string;
    cutoffScore: number;
    subjects: Array<{
      subjectName: string;
      attempted: number;
      correct: number;
    }>;
  }>;
  goals: Array<{
    id?: string;
    targetScore: number;
    targetDate: string;
  }>;
}

export const backupApi = {
  exportData: () => apiClient.get<BackupData>('/backup/export'),
  importData: (data: ImportRequest) => apiClient.post<{ message: string }>('/backup/import', data),
};
