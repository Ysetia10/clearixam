// Centralized API configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api',
  timeout: 30000,
  withCredentials: false,
} as const;

// Validate environment configuration
if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn('VITE_API_BASE_URL not set, using default localhost');
}

export default API_CONFIG;
