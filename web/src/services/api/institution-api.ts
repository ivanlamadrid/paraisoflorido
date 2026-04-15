import { api } from 'boot/axios';
import { apiCacheTags, apiCacheTtls } from 'src/services/api/cache-policies';
import {
  invalidateDataCache,
  primeDataCache,
  readWithDataCache,
} from 'src/services/api/data-cache';
import type {
  ExecuteSchoolYearPreparationPayload,
  ExecuteSchoolYearPreparationResponse,
  InstitutionSettings,
  SchoolYearPreparationPreview,
  SchoolYearPreparationPreviewPayload,
  UpdateInstitutionSettingsPayload,
} from 'src/types/institution';

const institutionSettingsKey = ['institution', 'settings'] as const;

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  const { data } = await api.get<InstitutionSettings>('/institution/settings');
  return data;
}

export async function getInstitutionSettingsCached(options: {
  forceRefresh?: boolean;
} = {}): Promise<InstitutionSettings> {
  return readWithDataCache({
    fetcher: getInstitutionSettings,
    forceRefresh: options.forceRefresh,
    keyParts: institutionSettingsKey,
    scope: 'public',
    storage: 'localStorage',
    tags: [apiCacheTags.institution],
    ttlMs: apiCacheTtls.institutionSettings,
  });
}

export function primeInstitutionSettingsCache(settings: InstitutionSettings): void {
  primeDataCache({
    keyParts: institutionSettingsKey,
    scope: 'public',
    storage: 'localStorage',
    tags: [apiCacheTags.institution],
    ttlMs: apiCacheTtls.institutionSettings,
    value: settings,
  });
}

export function invalidateInstitutionSettingsCache(): void {
  invalidateDataCache({ tags: [apiCacheTags.institution] });
}

export async function updateInstitutionSettings(
  payload: UpdateInstitutionSettingsPayload,
): Promise<InstitutionSettings> {
  const { data } = await api.put<InstitutionSettings>(
    '/institution/settings',
    payload,
  );

  invalidateDataCache({
    tags: [
      apiCacheTags.institution,
      apiCacheTags.students,
      apiCacheTags.studentDetail,
      apiCacheTags.studentFollowUpsOverview,
      apiCacheTags.studentProfile,
      apiCacheTags.personnelUsers,
      apiCacheTags.tutorAssignments,
    ],
  });

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

  invalidateDataCache();

  return data;
}
