import { getToken } from './auth';
import { errorLogger } from '../utils/errorLogger';

const API_BASE_URL = 'http://localhost:8081/api';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        window.location.href = '/login';
      }
      
      const error = new Error(`API Error: ${response.statusText}`);
      errorLogger.logApiError({ response: { status: response.status, statusText: response.statusText } }, endpoint);
      throw error;
    }

    return response.json();
  } catch (error: any) {
    if (!error.message?.includes('API Error')) {
      errorLogger.logApiError(error, endpoint);
    }
    throw error;
  }
}
