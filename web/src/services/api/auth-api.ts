import { api } from 'boot/axios';
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
  ChangeInitialPasswordPayload,
  ChangeInitialPasswordResponse,
  LoginPayload,
  LoginResponse,
  SessionUser,
} from 'src/types/session';

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function getCurrentUser(): Promise<SessionUser> {
  const { data } = await api.get<SessionUser>('/auth/me');
  return data;
}

export async function changeInitialPassword(
  payload: ChangeInitialPasswordPayload,
): Promise<ChangeInitialPasswordResponse> {
  const { data } = await api.post<ChangeInitialPasswordResponse>(
    '/auth/change-initial-password',
    payload,
  );

  return data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  const { data } = await api.post<ChangePasswordResponse>(
    '/auth/change-password',
    payload,
  );

  return data;
}
