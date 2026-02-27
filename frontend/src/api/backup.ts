import { getToken } from './auth';
import { errorLogger } from '../utils/errorLogger';

const API_BASE_URL = 'http://localhost:8081/api';

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
  exportData: async (): Promise<BackupData> => {
    const token = getToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/backup/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      errorLogger.logApiError(error, '/backup/export');
      throw error;
    }
  },

  importData: async (data: ImportRequest): Promise<{ message: string }> => {
    const token = getToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/backup/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, statusText: response.statusText, data: errorData } };
      }

      return await response.json();
    } catch (error: any) {
      errorLogger.logApiError(error, '/backup/import');
      throw error;
    }
  },
};
