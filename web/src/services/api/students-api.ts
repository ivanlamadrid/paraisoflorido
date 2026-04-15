import { api } from 'boot/axios';
import { apiCacheTags, apiCacheTtls } from 'src/services/api/cache-policies';
import {
  invalidateDataCache,
  readWithDataCache,
} from 'src/services/api/data-cache';
import type {
  CreateStudentPayload,
  CreateStudentContactPayload,
  CreateStudentFollowUpPayload,
  ImportStudentsPayload,
  StudentExportQuery,
  StudentDetail,
  StudentContact,
  StudentConsent,
  StudentFollowUp,
  StudentFollowUpOverviewQuery,
  StudentFollowUpOverviewResponse,
  StudentImportPreviewResponse,
  StudentImportResultResponse,
  StudentProfile,
  StudentSummary,
  StudentsListResponse,
  StudentsQuery,
  UpdateStudentContactPayload,
  UpdateStudentConsentPayload,
  UpdateStudentFollowUpPayload,
  UpdateStudentSituationPayload,
  UpdateStudentPayload,
} from 'src/types/students';

function invalidateStudentsCache(): void {
  invalidateDataCache({
    tags: [
      apiCacheTags.students,
      apiCacheTags.studentDetail,
      apiCacheTags.studentProfile,
      apiCacheTags.studentFollowUpsOverview,
    ],
  });
}

export async function getStudents(
  query: StudentsQuery,
): Promise<StudentsListResponse> {
  const { data } = await api.get<StudentsListResponse>('/students', {
    params: query,
  });

  return data;
}

export async function getStudentsCached(
  query: StudentsQuery,
  options: { forceRefresh?: boolean } = {},
): Promise<StudentsListResponse> {
  return readWithDataCache({
    fetcher: () => getStudents(query),
    forceRefresh: options.forceRefresh,
    keyParts: ['students', 'list', query],
    tags: [apiCacheTags.students],
    ttlMs: apiCacheTtls.students,
  });
}

export async function getStudentByCode(code: string): Promise<StudentSummary> {
  const { data } = await api.get<StudentSummary>(
    `/students/code/${encodeURIComponent(code.trim().toLowerCase())}`,
  );

  return data;
}

export async function getMyStudentProfile(): Promise<StudentProfile> {
  const { data } = await api.get<StudentProfile>('/students/me');
  return data;
}

export async function getMyStudentProfileCached(options: {
  forceRefresh?: boolean;
} = {}): Promise<StudentProfile> {
  return readWithDataCache({
    fetcher: getMyStudentProfile,
    forceRefresh: options.forceRefresh,
    keyParts: ['students', 'me'],
    tags: [apiCacheTags.studentProfile],
    ttlMs: apiCacheTtls.studentProfile,
  });
}

export async function getMyStudentInstitutionalProfile(): Promise<StudentDetail> {
  const { data } = await api.get<StudentDetail>('/students/me/profile');
  return data;
}

export async function getMyStudentInstitutionalProfileCached(options: {
  forceRefresh?: boolean;
} = {}): Promise<StudentDetail> {
  return readWithDataCache({
    fetcher: getMyStudentInstitutionalProfile,
    forceRefresh: options.forceRefresh,
    keyParts: ['students', 'me', 'profile'],
    tags: [apiCacheTags.studentProfile, apiCacheTags.studentDetail],
    ttlMs: apiCacheTtls.studentProfile,
  });
}

export async function getStudentDetail(studentId: string): Promise<StudentDetail> {
  const { data } = await api.get<StudentDetail>(`/students/${studentId}`);
  return data;
}

export async function getStudentInstitutionalProfile(
  studentId: string,
): Promise<StudentDetail> {
  const { data } = await api.get<StudentDetail>(`/students/${studentId}/profile`);
  return data;
}

export async function getStudentInstitutionalProfileCached(
  studentId: string,
  options: { forceRefresh?: boolean } = {},
): Promise<StudentDetail> {
  return readWithDataCache({
    fetcher: () => getStudentInstitutionalProfile(studentId),
    forceRefresh: options.forceRefresh,
    keyParts: ['students', 'detail', studentId, 'profile'],
    tags: [apiCacheTags.studentDetail],
    ttlMs: apiCacheTtls.studentDetail,
  });
}

export async function createStudent(
  payload: CreateStudentPayload,
): Promise<StudentDetail> {
  const { data } = await api.post<StudentDetail>('/students', payload);
  invalidateStudentsCache();
  return data;
}

export async function previewStudentsImport(
  file: File,
): Promise<StudentImportPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<StudentImportPreviewResponse>(
    '/students/import/preview',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

export async function importStudents(
  payload: ImportStudentsPayload,
): Promise<StudentImportResultResponse> {
  const { data } = await api.post<StudentImportResultResponse>(
    '/students/import',
    payload,
  );

  invalidateStudentsCache();

  return data;
}

function resolveStudentExportFileName(
  contentDisposition: string | undefined,
  query: StudentExportQuery,
): string {
  if (contentDisposition) {
    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }

    const simpleMatch = contentDisposition.match(/filename="([^"]+)"/i);

    if (simpleMatch?.[1]) {
      return simpleMatch[1];
    }
  }

  return query.format === 'xlsx' ? 'estudiantes.xlsx' : 'estudiantes.csv';
}

export async function exportStudents(
  query: StudentExportQuery,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get<Blob>('/students/export', {
    params: query,
    responseType: 'blob',
  });

  return {
    blob: response.data,
    fileName: resolveStudentExportFileName(
      response.headers['content-disposition'] as string | undefined,
      query,
    ),
  };
}

export async function updateStudent(
  studentId: string,
  payload: UpdateStudentPayload,
): Promise<StudentDetail> {
  const { data } = await api.patch<StudentDetail>(`/students/${studentId}`, payload);
  invalidateStudentsCache();
  return data;
}

export async function updateStudentProfile(
  studentId: string,
  payload: UpdateStudentPayload,
): Promise<StudentDetail> {
  const { data } = await api.patch<StudentDetail>(
    `/students/${studentId}/profile`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}

export async function getStudentContacts(studentId: string): Promise<StudentContact[]> {
  const { data } = await api.get<StudentContact[]>(`/students/${studentId}/contacts`);
  return data;
}

export async function createStudentContact(
  studentId: string,
  payload: CreateStudentContactPayload,
): Promise<StudentContact[]> {
  const { data } = await api.post<StudentContact[]>(
    `/students/${studentId}/contacts`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}

export async function updateStudentContact(
  studentId: string,
  contactId: string,
  payload: UpdateStudentContactPayload,
): Promise<StudentContact[]> {
  const { data } = await api.patch<StudentContact[]>(
    `/students/${studentId}/contacts/${contactId}`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}

export async function deleteStudentContact(
  studentId: string,
  contactId: string,
): Promise<StudentContact[]> {
  const { data } = await api.delete<StudentContact[]>(
    `/students/${studentId}/contacts/${contactId}`,
  );

  invalidateStudentsCache();

  return data;
}

export async function updateStudentSituation(
  studentId: string,
  payload: UpdateStudentSituationPayload,
): Promise<StudentDetail> {
  const { data } = await api.patch<StudentDetail>(
    `/students/${studentId}/situation`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}

export async function updateStudentConsent(
  studentId: string,
  payload: UpdateStudentConsentPayload,
): Promise<StudentConsent | null> {
  const { data } = await api.patch<StudentConsent | null>(
    `/students/${studentId}/consent`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}

export async function getStudentFollowUps(
  studentId: string,
): Promise<StudentFollowUp[]> {
  const { data } = await api.get<StudentFollowUp[]>(
    `/students/${studentId}/follow-ups`,
  );
  return data;
}

export async function getStudentFollowUpsOverview(
  query: StudentFollowUpOverviewQuery,
): Promise<StudentFollowUpOverviewResponse> {
  const { data } = await api.get<StudentFollowUpOverviewResponse>(
    '/students/follow-ups/overview',
    {
      params: query,
    },
  );

  return data;
}

export async function getStudentFollowUpsOverviewCached(
  query: StudentFollowUpOverviewQuery,
  options: { forceRefresh?: boolean } = {},
): Promise<StudentFollowUpOverviewResponse> {
  return readWithDataCache({
    fetcher: () => getStudentFollowUpsOverview(query),
    forceRefresh: options.forceRefresh,
    keyParts: ['students', 'follow-ups', 'overview', query],
    tags: [apiCacheTags.studentFollowUpsOverview],
    ttlMs: apiCacheTtls.studentFollowUpsOverview,
  });
}

export async function createStudentFollowUp(
  studentId: string,
  payload: CreateStudentFollowUpPayload,
): Promise<StudentFollowUp[]> {
  const { data } = await api.post<StudentFollowUp[]>(
    `/students/${studentId}/follow-ups`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}

export async function updateStudentFollowUp(
  studentId: string,
  followUpId: string,
  payload: UpdateStudentFollowUpPayload,
): Promise<StudentFollowUp[]> {
  const { data } = await api.patch<StudentFollowUp[]>(
    `/students/${studentId}/follow-ups/${followUpId}`,
    payload,
  );

  invalidateStudentsCache();

  return data;
}
