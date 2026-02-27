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
  create: (data: CreateGoalRequest) =>
    apiClient<GoalResponse>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => apiClient<GoalResponse[]>('/goals'),

  delete: (id: string) =>
    apiClient<void>(`/goals/${id}`, {
      method: 'DELETE',
    }),
};
