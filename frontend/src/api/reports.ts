import { getToken } from './auth';
import { errorLogger } from '../utils/errorLogger';

const API_BASE_URL = 'http://localhost:8081/api';

export const reportsApi = {
  downloadPerformanceReport: async (): Promise<Blob> => {
    const token = getToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/performance`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      errorLogger.logApiError(error, '/reports/performance');
      throw error;
    }
  },
};
