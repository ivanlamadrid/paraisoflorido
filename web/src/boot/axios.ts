import { boot } from 'quasar/wrappers';
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: false,
});

let authFailureHandler: (() => void) | null = null;

function shouldHandleAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status ?? null;
  const requestUrl = String(error.config?.url ?? '');

  if (status !== 401 && !(status === 403 && requestUrl.includes('/auth/me'))) {
    return false;
  }

  return !requestUrl.includes('/auth/login');
}

export function setApiAuthToken(token: string | null): void {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }

  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (authFailureHandler && shouldHandleAuthFailure(error)) {
      authFailureHandler();
    }

    return Promise.reject(
      error instanceof Error ? error : new Error('API response interceptor failed.'),
    );
  },
);

export default boot(({ app }) => {
  app.config.globalProperties.$api = api;
});
