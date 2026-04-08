import { defineStore } from 'pinia';
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
} from 'src/types/session';

const SESSION_TOKEN_KEY = 'colegio.session.token';
let initializePromise: Promise<void> | null = null;

function readPersistedToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

function persistToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
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
    persistToken(nextToken);
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
      const persistedToken = readPersistedToken();

      if (!persistedToken) {
        applySession(null, null);
        initialized.value = true;
        return;
      }

      try {
        setApiAuthToken(persistedToken);
        const currentUser = await getCurrentUser();
        applySession(persistedToken, currentUser);
      } catch {
        applySession(null, null);
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
    if (!token.value) {
      return null;
    }

    const currentUser = await getCurrentUser();
    user.value = currentUser;
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
