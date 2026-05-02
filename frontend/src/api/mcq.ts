import { apiClient } from './client';
import { API_CONFIG } from '../config/apiConfig';

export interface MCQResult {
  id?: number;
  subject: string;
  topic: string;
  confidence: number;
  matchedKeywords: string[];
  cleanedText: string;
  status: string;
  needsLLM: boolean;
  source: 'RULE' | 'LLM';
  difficulty?: string;
  canEdit: boolean;
  presetOutcome?: 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';
  imagePreview?: string;
}

export interface MCQCorrection {
  id: number;
  subject: string;
  topic: string;
}

export interface CorrectionResponse {
  id: number;
  success: boolean;
  message: string;
  originalClassification: string;
  correctedClassification: string;
}

export interface RecentCorrection {
  id: number;
  questionText: string;
  original: string;
  corrected: string;
  correctedAt: string;
}

export interface MCQOutcome {
  id: number;
  outcome: 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';
}

export interface OutcomeResponse {
  id: number;
  success: boolean;
  message: string;
  outcome: string;
}

export interface TopicPerformance {
  subject: string;
  topic: string;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
}

export const processImage = async (file: File): Promise<MCQResult> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_CONFIG.baseURL}/mcq/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Image processing failed');
  }

  const result = await response.json();
  
  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.message || 'Image processing failed');
  }
};

export const processText = async (text: string): Promise<MCQResult> => {
  const response = await apiClient.post<{ success: boolean; data: MCQResult; message?: string }>('/mcq/process-text', {
    text: text.trim(),
  });
  
  if (response.success && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || 'Text processing failed');
  }
};

export const submitCorrection = async (correction: MCQCorrection): Promise<CorrectionResponse> => {
  const response = await apiClient.post<{ success: boolean; data: CorrectionResponse; message?: string }>('/mcq/correct', correction);
  
  if (response.success && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || 'Failed to submit correction');
  }
};

export const setOutcome = async (outcome: MCQOutcome): Promise<OutcomeResponse> => {
  const response = await apiClient.post<{ success: boolean; data: OutcomeResponse; message?: string }>('/mcq/set-outcome', outcome);
  
  if (response.success && response.data) {
    return response.data;
  } else {
    throw new Error(response.message || 'Failed to set outcome');
  }
};

export const getRecentCorrections = async (): Promise<RecentCorrection[]> => {
  const response = await apiClient.get<{ success: boolean; data: any[] }>('/mcq/recent-corrections');
  
  return (response.data || []).map((item: any) => ({
    id: item.id,
    questionText: item.questionText,
    original: item.original,
    corrected: item.corrected,
    correctedAt: item.correctedAt
  }));
};

export const getTopicPerformance = async (): Promise<TopicPerformance[]> => {
  const response = await apiClient.get<{ success: boolean; data: TopicPerformance[] }>('/mcq/topic-performance');
  return response.data;
};

export const AVAILABLE_SUBJECTS = [
  'Quantitative Aptitude',
  'Reasoning', 
  'English',
  'General Awareness'
];