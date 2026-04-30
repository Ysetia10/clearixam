import { apiClient } from './client';

// ── Shared wrapper ────────────────────────────────────────────────────────────
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const res = await promise;
  if (!res.success || res.data === undefined) {
    throw new Error(res.message || 'Request failed');
  }
  return res.data;
}

// ── Overview ──────────────────────────────────────────────────────────────────
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

// ── Trend ─────────────────────────────────────────────────────────────────────
export interface TrendPoint {
  date: string;
  score: number;
  movingAverage: number;
}

export interface AnalyticsTrend {
  trends: TrendPoint[];
}

// ── Subject Analytics ─────────────────────────────────────────────────────────
export type SubjectStatus = 'IMPROVING' | 'DECLINING' | 'STABLE';

export interface SubjectAnalyticsDTO {
  subjectName: string;
  avgAccuracy: number;
  avgAttemptsPerMock: number;
  totalMocksAttempted: number;
  lastAttemptedDate: string | null;
  trend: number;
  status: SubjectStatus;
}

export interface SubjectAnalyticsListResponse {
  subjects: SubjectAnalyticsDTO[];
}

// ── Subject Neglect ───────────────────────────────────────────────────────────
export type NeglectStatus = 'NEGLECTED' | 'PARTIALLY_NEGLECTED' | 'ACTIVE';

export interface SubjectNeglectDTO {
  subjectName: string;
  status: NeglectStatus;
  lastAttemptedMockIndex: number;
  appearedInLastN: number;
}

export interface SubjectNeglectResponse {
  windowSize: number;
  subjects: SubjectNeglectDTO[];
}

// ── Attempt vs Accuracy ───────────────────────────────────────────────────────
export type AttemptAccuracyTrend = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface AttemptAccuracyInsightDTO {
  trend: AttemptAccuracyTrend;
  highAttemptAccuracy: number;
  lowAttemptAccuracy: number;
  highAttemptAvgRate: number;
  lowAttemptAvgRate: number;
  insight: string;
}

// ── API ───────────────────────────────────────────────────────────────────────
const qs = (examId?: string) => (examId ? `?examId=${examId}` : '');

export const analyticsApi = {
  getOverview: (examId?: string) =>
    unwrap(apiClient.get<ApiResponse<AnalyticsOverview>>(`/analytics/overview${qs(examId)}`)),

  getTrend: (examId?: string) =>
    unwrap(apiClient.get<ApiResponse<AnalyticsTrend>>(`/analytics/trend${qs(examId)}`)),

  getSubjectAnalytics: (examId?: string) =>
    unwrap(apiClient.get<ApiResponse<SubjectAnalyticsListResponse>>(`/analytics/subjects${qs(examId)}`)),

  getSubjectNeglect: (examId?: string, windowSize = 5) =>
    unwrap(apiClient.get<ApiResponse<SubjectNeglectResponse>>(
      `/analytics/subjects/neglect?windowSize=${windowSize}${examId ? `&examId=${examId}` : ''}`
    )),

  getAttemptAccuracyInsight: (examId?: string) =>
    unwrap(apiClient.get<ApiResponse<AttemptAccuracyInsightDTO>>(`/analytics/attempt-accuracy${qs(examId)}`)),
};
