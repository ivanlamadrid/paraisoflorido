import { api } from 'boot/axios';
import { apiCacheTags, apiCacheTtls } from 'src/services/api/cache-policies';
import {
  invalidateDataCache,
  readWithDataCache,
} from 'src/services/api/data-cache';
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

function invalidateUsersCache(): void {
  invalidateDataCache({
    tags: [apiCacheTags.personnelUsers, apiCacheTags.tutorAssignments],
  });
}

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

export async function getPersonnelUsersCached(
  query: UsersQuery,
  options: { forceRefresh?: boolean } = {},
): Promise<UsersListResponse> {
  return readWithDataCache({
    fetcher: () => getPersonnelUsers(query),
    forceRefresh: options.forceRefresh,
    keyParts: ['users', 'personnel', query],
    tags: [apiCacheTags.personnelUsers],
    ttlMs: apiCacheTtls.personnelUsers,
  });
}

export async function getMyTutorAssignments(): Promise<TutorAssignmentSummary[]> {
  const { data } = await api.get<TutorAssignmentSummary[]>(
    '/users/me/tutor-assignments',
  );

  return data;
}

export async function getMyTutorAssignmentsCached(options: {
  forceRefresh?: boolean;
} = {}): Promise<TutorAssignmentSummary[]> {
  return readWithDataCache({
    fetcher: getMyTutorAssignments,
    forceRefresh: options.forceRefresh,
    keyParts: ['users', 'me', 'tutor-assignments'],
    tags: [apiCacheTags.tutorAssignments],
    ttlMs: apiCacheTtls.tutorAssignments,
  });
}

export async function createPersonnelUser(
  payload: CreatePersonnelUserPayload,
): Promise<UserSummary> {
  const { data } = await api.post<UserSummary>('/users/personnel', payload);

  invalidateUsersCache();

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

  invalidateUsersCache();

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

  invalidateUsersCache();

  return data;
}
