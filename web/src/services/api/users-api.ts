import { api } from 'boot/axios';
import type {
  CreatePersonnelUserPayload,
  ResetUserPasswordPayload,
  ResetUserPasswordResponse,
  TutorAssignmentSummary,
  UpdatePersonnelUserPayload,
  UserSummary,
  UsersListResponse,
  UsersQuery,
} from 'src/types/users';

export async function getUsers(query: UsersQuery): Promise<UsersListResponse> {
  const { data } = await api.get<UsersListResponse>('/users', {
    params: query,
  });

  return data;
}

export async function getPersonnelUsers(
  query: UsersQuery,
): Promise<UsersListResponse> {
  const { data } = await api.get<UsersListResponse>('/users/personnel', {
    params: query,
  });

  return data;
}

export async function getMyTutorAssignments(): Promise<TutorAssignmentSummary[]> {
  const { data } = await api.get<TutorAssignmentSummary[]>(
    '/users/me/tutor-assignments',
  );

  return data;
}

export async function createPersonnelUser(
  payload: CreatePersonnelUserPayload,
): Promise<UserSummary> {
  const { data } = await api.post<UserSummary>('/users/personnel', payload);
  return data;
}

export async function updatePersonnelUser(
  userId: string,
  payload: UpdatePersonnelUserPayload,
): Promise<UserSummary> {
  const { data } = await api.patch<UserSummary>(
    `/users/personnel/${userId}`,
    payload,
  );
  return data;
}

export async function resetUserPassword(
  userId: string,
  payload: ResetUserPasswordPayload,
): Promise<ResetUserPasswordResponse> {
  const { data } = await api.post<ResetUserPasswordResponse>(
    `/users/${userId}/reset-password`,
    payload,
  );

  return data;
}
