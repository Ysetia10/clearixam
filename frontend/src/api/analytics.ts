import { apiClient } from './client';

export interface WeakSubject {
  subjectName: string;
  accuracy: number;
}

export interface AnalyticsOverview {
  averageScore: number;
  movingAverage: number;
  improvementRate: number;
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  weakSubjects: WeakSubject[];
}

export interface TrendPoint {
  date: string;
  score: number;
  movingAverage: number;
}

export interface AnalyticsTrend {
  trends: TrendPoint[];
}

export const analyticsApi = {
  getOverview: () => apiClient<AnalyticsOverview>('/analytics/overview'),
  getTrend: () => apiClient<AnalyticsTrend>('/analytics/trend'),
};
