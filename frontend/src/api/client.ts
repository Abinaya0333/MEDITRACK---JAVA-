import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const TOKEN_KEY = 'meditrack_token';
export const USER_KEY = 'meditrack_user';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

/** Listener invoked when the API rejects a request with 401, so the app can drop session state. */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

// Add JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/** Mirrors the `ApiError` record produced by GlobalExceptionHandler. */
export interface ApiErrorBody {
  status?: number;
  message?: string;
  timestamp?: string;
  errors?: Record<string, string>;
}

/** Normalises any axios failure into a single readable string, including per-field validation messages. */
export function toErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    const errors = body?.errors;
    if (errors && Object.keys(errors).length > 0) {
      return Object.values(errors).join(' ');
    }
    if (body?.message) return body.message;
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (!error.response) return 'Cannot reach the server. Is the backend running?';
    return `Request failed with status ${error.response.status}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** First validation message for a specific field, if the server rejected it. */
export function fieldErrorOf(error: unknown, field: string): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const body = error.response?.data as ApiErrorBody | undefined;
  return body?.errors?.[field];
}

export default api;

export type { InternalAxiosRequestConfig };