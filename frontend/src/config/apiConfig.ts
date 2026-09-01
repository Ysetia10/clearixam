const rawBaseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '')

export const API_CONFIG = {
  baseURL: rawBaseURL,
  healthURL: `${rawBaseURL.replace(/\/api$/, '')}/health`,
  timeout: import.meta.env.PROD ? 60_000 : 10_000,
  maxNetworkRetries: import.meta.env.PROD ? 2 : 0,
  withCredentials: false,
} as const

export default API_CONFIG
