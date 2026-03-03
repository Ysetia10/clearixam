import { apiClient } from './client';

export interface CreateGoalRequest {
  targetScore: number;
  targetDate: string;
}

export interface GoalResponse {
  id: string;
  targetScore: number;
  targetDate: string;
  createdAt: string;
}

export const goalsApi = {
  create: (data: CreateGoalRequest) => apiClient.post<GoalResponse>('/goals', data),
  list: () => apiClient.get<GoalResponse[]>('/goals'),
  delete: (id: string) => apiClient.delete<void>(`/goals/${id}`),
};
