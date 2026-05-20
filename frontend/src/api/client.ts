import axios, { AxiosError } from 'axios';
import type { GenerateRequest, GenerateResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as typeof error.config & { _retry?: number };
    if (!config) throw error;

    const status = error.response?.status;
    const isNetwork = !error.response;
    const retries = config._retry ?? 0;

    if ((isNetwork || status === 503) && retries < 2) {
      config._retry = retries + 1;
      await new Promise((r) => setTimeout(r, 1000 * (retries + 1)));
      return api.request(config);
    }
    throw error;
  },
);

export async function generateTest(
  request: GenerateRequest,
): Promise<GenerateResponse> {
  const { data } = await api.post<GenerateResponse>('/generate', request);
  return data;
}

export async function uploadFile(file: File): Promise<{ text: string; filename: string; charCount: number }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    maxContentLength: 21 * 1024 * 1024,
  });
  return data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const { data } = await api.get('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
    if (error.code === 'ECONNABORTED') return 'Request timeout';
    if (!error.response) return 'Backend unavailable. Retrying...';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}
