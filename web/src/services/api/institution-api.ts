import { api } from 'boot/axios';
import type {
  ExecuteSchoolYearPreparationPayload,
  ExecuteSchoolYearPreparationResponse,
  InstitutionSettings,
  SchoolYearPreparationPreview,
  SchoolYearPreparationPreviewPayload,
  UpdateInstitutionSettingsPayload,
} from 'src/types/institution';

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  const { data } = await api.get<InstitutionSettings>('/institution/settings');
  return data;
}

export async function updateInstitutionSettings(
  payload: UpdateInstitutionSettingsPayload,
): Promise<InstitutionSettings> {
  const { data } = await api.put<InstitutionSettings>(
    '/institution/settings',
    payload,
  );
  return data;
}

export async function previewSchoolYearPreparation(
  payload: SchoolYearPreparationPreviewPayload,
): Promise<SchoolYearPreparationPreview> {
  const { data } = await api.post<SchoolYearPreparationPreview>(
    '/institution/school-year/preparation/preview',
    payload,
  );
  return data;
}

export async function executeSchoolYearPreparation(
  payload: ExecuteSchoolYearPreparationPayload,
): Promise<ExecuteSchoolYearPreparationResponse> {
  const { data } = await api.post<ExecuteSchoolYearPreparationResponse>(
    '/institution/school-year/preparation',
    payload,
  );
  return data;
}
