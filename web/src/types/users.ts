import type { UserRole } from 'src/types/session';
import type { StudentShift } from 'src/types/attendance';

export interface TutorAssignmentSummary {
  id: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  assignments?: TutorAssignmentSummary[];
}

export interface UsersQuery {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UsersListResponse {
  items: UserSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ResetUserPasswordPayload {
  newPassword: string;
  reason: string;
}

export interface ResetUserPasswordResponse {
  message: string;
  targetUserId: string;
  mustChangePassword: boolean;
  resetAt: string;
}

export interface CreatePersonnelUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  role: Extract<UserRole, 'secretary' | 'auxiliary' | 'tutor'>;
  temporaryPassword: string;
  isActive: boolean;
  mustChangePassword: boolean;
  assignments?: TutorAssignmentInput[];
}

export interface UpdatePersonnelUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  role: Extract<UserRole, 'secretary' | 'auxiliary' | 'tutor'>;
  isActive: boolean;
  assignments?: TutorAssignmentInput[];
}

export interface TutorAssignmentInput {
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
}
