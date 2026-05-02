export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api',
  timeout: 30000,
  withCredentials: false,
} as const;

export default API_CONFIG;
