import { apiClient } from './client';

export const reportsApi = {
  downloadPerformanceReport: () => apiClient.download('/reports/performance'),
};
