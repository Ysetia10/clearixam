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
  recommendedAttemptRange: string;
  strategyNote: string;
  consistencyScore: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  goalProgress: {
    goalProgressPercent: number;
    daysRemaining: number;
    onTrack: boolean;
    currentScore: number;
    targetScore: number;
  } | null;
  lastFiveAverage: number;
  previousFiveAverage: number;
  performanceChange: number;
}

export interface TrendPoint {
  date: string;
  score: number;
  movingAverage: number;
}

export interface AnalyticsTrend {
  trends: TrendPoint[];
}

export interface SubjectAnalysis {
  subjectName: string;
  averageScore: number;
  averageAccuracy: number;
  improvementRate: number;
  trend: {
    dates: string[];
    scores: number[];
    accuracy: number[];
  };
}

export interface SubjectAnalyticsResponse {
  subjects: SubjectAnalysis[];
}

export const analyticsApi = {
  getOverview: (examId?: string) =>
    apiClient.get<AnalyticsOverview>(`/analytics/overview${examId ? `?examId=${examId}` : ''}`),
  getTrend: (examId?: string) =>
    apiClient.get<AnalyticsTrend>(`/analytics/trend${examId ? `?examId=${examId}` : ''}`),
  getSubjectAnalytics: () => apiClient.get<SubjectAnalyticsResponse>('/analytics/subjects'),
};
