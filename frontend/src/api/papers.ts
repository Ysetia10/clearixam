import { apiClient } from './client';

export interface LatestAttemptSummary {
  attemptId: string;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  submittedAt: string | null;
}

export interface PaperSummary {
  id: string;
  slug: string;
  title: string;
  examId: string;
  examName: string;
  year: number;
  slot: string;
  durationMinutes: number;
  questionCount: number;
  latestAttempt: LatestAttemptSummary | null;
}

export interface PaperQuestion {
  qNo: number;
  section: string;
  sectionCode: string;
  type: 'MCQ' | 'TITA' | string;
  stem: string;
  options: Record<string, string> | null;
  stimulus: string | null;
  setRange: number[] | null;
  images: string[] | null;
  chartDependent: boolean;
}

export interface PaperDetail {
  id: string;
  slug: string;
  title: string;
  examName: string;
  year: number;
  slot: string;
  durationMinutes: number;
  questionCount: number;
  marking: { correct: number; incorrect: number; unattempted: number };
  questions: PaperQuestion[];
}

export interface StartAttemptResponse {
  attemptId: string;
  paper: PaperDetail;
  startedAt: string;
  durationMinutes: number;
}

export interface SectionScore {
  sectionCode: string;
  section: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
}

export interface TopicScore {
  topic: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
}

export interface SectionAnalysis {
  sectionCode: string;
  section: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  topics: TopicScore[];
}

export interface AttemptResult {
  attemptId: string;
  paperId: string;
  paperTitle: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  questionCount: number;
  sections: SectionScore[];
  answers: Record<string, string>;
}

export interface AttemptAnalysis {
  attemptId: string;
  paperId: string;
  paperTitle: string;
  examName: string;
  submittedAt: string | null;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  questionCount: number;
  topicsTagged: boolean;
  sections: SectionAnalysis[];
}

/** Jackson/Kotlin sometimes emits qNo as "qno"; normalize for the UI. */
function normalizeQuestion(raw: PaperQuestion & { qno?: number }): PaperQuestion {
  return {
    ...raw,
    qNo: raw.qNo ?? raw.qno ?? 0,
  };
}

function normalizePaper(paper: PaperDetail): PaperDetail {
  return {
    ...paper,
    questions: (paper.questions || []).map((q) =>
      normalizeQuestion(q as PaperQuestion & { qno?: number })
    ),
  };
}

export const papersApi = {
  list: (examId?: string) =>
    apiClient.get<PaperSummary[]>(
      examId ? `/papers?examId=${encodeURIComponent(examId)}` : '/papers'
    ),
  get: async (id: string) => normalizePaper(await apiClient.get<PaperDetail>(`/papers/${id}`)),
  startAttempt: async (id: string) => {
    const started = await apiClient.post<StartAttemptResponse>(`/papers/${id}/attempts`, {});
    return { ...started, paper: normalizePaper(started.paper) };
  },
  submitAttempt: (attemptId: string, answers: Record<string, string>) =>
    apiClient.post<AttemptResult>(`/attempts/${attemptId}/submit`, { answers }),
  getAttempt: (attemptId: string) =>
    apiClient.get<AttemptResult>(`/attempts/${attemptId}`),
  getAnalysis: (attemptId: string) =>
    apiClient.get<AttemptAnalysis>(`/attempts/${attemptId}/analysis`),
};
