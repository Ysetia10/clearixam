import { API_CONFIG } from '../config/apiConfig';
import { getToken, removeToken } from './auth';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'omit', // Don't send cookies cross-origin
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      // Handle 401/403 - Auto logout
      if (response.status === 401 || response.status === 403) {
        this.handleUnauthorized();
        throw new Error('Unauthorized - Please login again');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Extract the exact error message from backend
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text() as any;
    } catch (error: any) {
      // Network errors
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Network error - Please check your connection');
      }
      throw error;
    }
  }

  private handleUnauthorized(): void {
    removeToken();
    localStorage.removeItem('userEmail');
    
    // Only redirect if not already on login/register
    if (!window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/register')) {
      window.location.href = '/login';
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async download(endpoint: string): Promise<Blob> {
    const token = getToken();
    
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Legacy export for backward compatibility
export async function apiClientLegacy<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method || 'GET';
  
  switch (method.toUpperCase()) {
    case 'GET':
      return apiClient.get<T>(endpoint);
    case 'POST':
      return apiClient.post<T>(endpoint, options?.body ? JSON.parse(options.body as string) : undefined);
    case 'PUT':
      return apiClient.put<T>(endpoint, options?.body ? JSON.parse(options.body as string) : undefined);
    case 'DELETE':
      return apiClient.delete<T>(endpoint);
    default:
      return apiClient.get<T>(endpoint);
  }
}
