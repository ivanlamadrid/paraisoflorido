export type UserRole =
  | 'director'
  | 'secretary'
  | 'auxiliary'
  | 'tutor'
  | 'student';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

export interface StoredSession {
  accessToken: string;
  user: SessionUser;
}

export interface ChangeInitialPasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangeInitialPasswordResponse {
  message: string;
  accessToken: string;
  user: SessionUser;
}

export interface ChangePasswordResponse {
  message: string;
  accessToken: string;
  user: SessionUser;
}
