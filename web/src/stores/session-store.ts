import { defineStore } from 'pinia';
import axios from 'axios';
import { computed, ref } from 'vue';
import { setApiAuthToken } from 'boot/axios';
import { useInstitutionStore } from 'src/stores/institution-store';
import {
  changePassword,
  changeInitialPassword,
  getCurrentUser,
  login,
} from 'src/services/api/auth-api';
import type {
  ChangePasswordPayload,
  ChangeInitialPasswordPayload,
  LoginPayload,
  SessionUser,
  StoredSession,
} from 'src/types/session';

const SESSION_STORAGE_KEY = 'colegio.session';
const SESSION_TOKEN_KEY = 'colegio.session.token';
let initializePromise: Promise<void> | null = null;

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!canUseStorage() || typeof window.atob !== 'function') {
    return null;
  }

  const tokenParts = token.split('.');
  const payload = tokenParts[1];

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');

    return JSON.parse(window.atob(normalizedPayload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const expiresAt = typeof payload?.exp === 'number' ? payload.exp * 1000 : null;

  if (!expiresAt) {
    return false;
  }

  return expiresAt <= Date.now();
}

function readPersistedSession(): StoredSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredSession>;

    if (
      typeof parsed.accessToken === 'string' &&
      parsed.accessToken &&
      parsed.user &&
      typeof parsed.user.id === 'string' &&
      typeof parsed.user.username === 'string' &&
      typeof parsed.user.displayName === 'string' &&
      typeof parsed.user.role === 'string' &&
      typeof parsed.user.isActive === 'boolean' &&
      typeof parsed.user.mustChangePassword === 'boolean'
    ) {
      return {
        accessToken: parsed.accessToken,
        user: {
          id: parsed.user.id,
          username: parsed.user.username,
          displayName: parsed.user.displayName,
          role: parsed.user.role,
          isActive: parsed.user.isActive,
          mustChangePassword: parsed.user.mustChangePassword,
        },
      };
    }
  } catch {
    // Fall through to cleanup below.
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  return null;
}

function readPersistedToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

function persistSession(
  nextToken: string | null,
  nextUser: SessionUser | null,
): void {
  if (!canUseStorage()) {
    return;
  }

  if (!nextToken) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, nextToken);

  if (!nextUser) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: nextToken,
      user: nextUser,
    } satisfies StoredSession),
  );
}

function canAttemptRemoteValidation(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function canKeepPersistedSession(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status ?? null;

  if (status === 401 || status === 403) {
    return false;
  }

  return !error.response || (status !== null && status >= 500);
}

export function getDefaultRouteForUser(user: SessionUser | null): string {
  if (!user) {
    return '/login';
  }

  if (user.mustChangePassword) {
    return '/cambiar-contrasena-inicial';
  }

  if (user.role === 'student') {
    return '/mi-asistencia';
  }

  if (user.role === 'auxiliary') {
    return '/auxiliar/asistencia';
  }

  if (user.role === 'tutor') {
    return '/tutor';
  }

  return '/portal';
}

export const useSessionStore = defineStore('session', () => {
  const institutionStore = useInstitutionStore();
  const token = ref<string | null>(null);
  const user = ref<SessionUser | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));

  function applySession(nextToken: string | null, nextUser: SessionUser | null): void {
    token.value = nextToken;
    user.value = nextUser;
    persistSession(nextToken, nextUser);
    setApiAuthToken(nextToken);
  }

  async function initializeSession(force = false): Promise<void> {
    if (initialized.value && !force) {
      return;
    }

    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      const persistedSession = readPersistedSession();
      const persistedToken =
        persistedSession?.accessToken ?? readPersistedToken();
      const persistedUser = persistedSession?.user ?? null;

      if (!persistedToken || isTokenExpired(persistedToken)) {
        applySession(null, null);
        initialized.value = true;
        return;
      }

      if (persistedUser) {
        applySession(persistedToken, persistedUser);
      } else {
        token.value = persistedToken;
        user.value = null;
        setApiAuthToken(persistedToken);
      }

      if (!canAttemptRemoteValidation()) {
        initialized.value = true;
        return;
      }

      try {
        setApiAuthToken(persistedToken);
        const currentUser = await getCurrentUser();
        applySession(persistedToken, currentUser);
      } catch (error) {
        if (persistedUser && canKeepPersistedSession(error)) {
          applySession(persistedToken, persistedUser);
        } else {
          applySession(null, null);
        }
      } finally {
        initialized.value = true;
      }
    })();

    try {
      await initializePromise;
    } finally {
      initializePromise = null;
    }
  }

  async function loginWithCredentials(payload: LoginPayload): Promise<SessionUser> {
    const response = await login({
      username: payload.username.trim().toLowerCase(),
      password: payload.password,
    });

    applySession(response.accessToken, response.user);
    initialized.value = true;

    return response.user;
  }

  async function refreshCurrentUser(): Promise<SessionUser | null> {
    const currentToken = token.value;

    if (!currentToken) {
      return null;
    }

    const currentUser = await getCurrentUser();
    applySession(currentToken, currentUser);
    return currentUser;
  }

  async function changeStudentInitialPassword(
    payload: ChangeInitialPasswordPayload,
  ): Promise<SessionUser> {
    const response = await changeInitialPassword(payload);

    applySession(response.accessToken, response.user);

    return response.user;
  }

  async function changeOwnPassword(
    payload: ChangePasswordPayload,
  ): Promise<SessionUser> {
    const response = await changePassword(payload);

    applySession(response.accessToken, response.user);

    return response.user;
  }

  function logout(): void {
    applySession(null, null);
    institutionStore.reset();
    initialized.value = true;
  }

  return {
    token,
    user,
    initialized,
    isAuthenticated,
    initializeSession,
    loginWithCredentials,
    refreshCurrentUser,
    changeStudentInitialPassword,
    changeOwnPassword,
    logout,
  };
});
