import { api } from 'boot/axios';
import type {
  CreateStudentPayload,
  CreateStudentContactPayload,
  CreateStudentFollowUpPayload,
  StudentDetail,
  StudentContact,
  StudentConsent,
  StudentFollowUp,
  StudentFollowUpOverviewQuery,
  StudentFollowUpOverviewResponse,
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

export async function getStudents(
  query: StudentsQuery,
): Promise<StudentsListResponse> {
  const { data } = await api.get<StudentsListResponse>('/students', {
    params: query,
  });

  return data;
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

export async function getMyStudentInstitutionalProfile(): Promise<StudentDetail> {
  const { data } = await api.get<StudentDetail>('/students/me/profile');
  return data;
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

export async function createStudent(
  payload: CreateStudentPayload,
): Promise<StudentDetail> {
  const { data } = await api.post<StudentDetail>('/students', payload);
  return data;
}

export async function updateStudent(
  studentId: string,
  payload: UpdateStudentPayload,
): Promise<StudentDetail> {
  const { data } = await api.patch<StudentDetail>(`/students/${studentId}`, payload);
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
  return data;
}

export async function deleteStudentContact(
  studentId: string,
  contactId: string,
): Promise<StudentContact[]> {
  const { data } = await api.delete<StudentContact[]>(
    `/students/${studentId}/contacts/${contactId}`,
  );
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

export async function createStudentFollowUp(
  studentId: string,
  payload: CreateStudentFollowUpPayload,
): Promise<StudentFollowUp[]> {
  const { data } = await api.post<StudentFollowUp[]>(
    `/students/${studentId}/follow-ups`,
    payload,
  );
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
  return data;
}
