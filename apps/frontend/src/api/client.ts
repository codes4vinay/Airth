import axios, { AxiosError } from 'axios';

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

/**
 * Extracts a user-friendly error message from an Axios error.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.response?.data?.message) {
      const msg = axiosError.response.data.message;
      return Array.isArray(msg) ? msg.join(', ') : msg;
    }
    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    if (axiosError.message === 'Network Error') {
      return 'Unable to reach backend server. Ensure backend is running.';
    }
    return axiosError.message;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
