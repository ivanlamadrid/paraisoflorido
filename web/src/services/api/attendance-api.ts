import { api } from 'boot/axios';
import type {
  AttendanceAlertsQuery,
  AttendanceAlertsResponse,
  AttendanceCorrectionLog,
  AttendanceOfflineContextResponse,
  AttendanceOfflineSyncItemPayload,
  AttendanceOfflineSyncResponse,
  AttendanceDayStatus,
  AttendanceExportQuery,
  AttendanceHistoryQuery,
  AttendanceHistoryResponse,
  AttendanceRegularizationQuery,
  AttendanceRegularizationResponse,
  AttendanceRecordResponse,
  DailyAttendanceQuery,
  DailyAttendanceResponse,
  MonthlyAttendanceReportQuery,
  MonthlyAttendanceReportResponse,
  RegisterAttendanceByScanPayload,
  RegisterAttendanceManualPayload,
  UpsertAttendanceDayStatusPayload,
  UpdateAttendanceRecordPayload,
} from 'src/types/attendance';

export async function getMyAttendanceHistory(
  query: AttendanceHistoryQuery,
): Promise<AttendanceHistoryResponse> {
  const { data } = await api.get<AttendanceHistoryResponse>(
    '/attendance/me/history',
    {
      params: query,
    },
  );

  return data;
}

export async function getAttendanceAlerts(
  query: AttendanceAlertsQuery,
): Promise<AttendanceAlertsResponse> {
  const { data } = await api.get<AttendanceAlertsResponse>('/attendance/alerts', {
    params: query,
  });

  return data;
}

export async function getAttendanceOfflineContext(
  attendanceDate?: string,
): Promise<AttendanceOfflineContextResponse> {
  const { data } = await api.get<AttendanceOfflineContextResponse>(
    '/attendance/offline/context',
    {
      params: attendanceDate ? { attendanceDate } : undefined,
    },
  );

  return data;
}

export async function syncOfflineAttendanceBatch(
  items: AttendanceOfflineSyncItemPayload[],
): Promise<AttendanceOfflineSyncResponse> {
  const { data } = await api.post<AttendanceOfflineSyncResponse>(
    '/attendance/offline/sync',
    {
      items,
    },
  );

  return data;
}

export async function getAttendanceRegularization(
  query: AttendanceRegularizationQuery,
): Promise<AttendanceRegularizationResponse> {
  const { data } = await api.get<AttendanceRegularizationResponse>(
    '/attendance/regularization',
    {
      params: query,
    },
  );

  return data;
}

export async function getMonthlyAttendanceReport(
  query: MonthlyAttendanceReportQuery,
): Promise<MonthlyAttendanceReportResponse> {
  const { data } = await api.get<MonthlyAttendanceReportResponse>(
    '/attendance/reports/monthly',
    {
      params: query,
    },
  );

  return data;
}

function resolveAttendanceExportFileName(
  contentDisposition: string | undefined,
  query: AttendanceExportQuery,
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

  return query.format === 'xlsx' ? 'asistencia.xlsx' : 'asistencia.csv';
}

export async function exportAttendance(
  query: AttendanceExportQuery,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get<Blob>('/attendance/export', {
    params: query,
    responseType: 'blob',
  });

  return {
    blob: response.data,
    fileName: resolveAttendanceExportFileName(
      response.headers['content-disposition'] as string | undefined,
      query,
    ),
  };
}

export async function getDailyAttendance(
  query: DailyAttendanceQuery,
): Promise<DailyAttendanceResponse> {
  const { data } = await api.get<DailyAttendanceResponse>('/attendance/daily', {
    params: query,
  });

  return data;
}

export async function registerAttendanceByScan(
  payload: RegisterAttendanceByScanPayload,
): Promise<AttendanceRecordResponse> {
  const { data } = await api.post<AttendanceRecordResponse>(
    '/attendance/scan',
    payload,
  );

  return data;
}

export async function registerAttendanceManual(
  payload: RegisterAttendanceManualPayload,
): Promise<AttendanceRecordResponse> {
  const { data } = await api.post<AttendanceRecordResponse>(
    '/attendance/manual',
    payload,
  );

  return data;
}

export async function correctAttendanceRecord(
  attendanceRecordId: string,
  payload: UpdateAttendanceRecordPayload,
): Promise<AttendanceRecordResponse> {
  const { data } = await api.patch<AttendanceRecordResponse>(
    `/attendance/records/${attendanceRecordId}`,
    payload,
  );

  return data;
}

export async function getAttendanceCorrectionHistory(
  attendanceRecordId: string,
): Promise<AttendanceCorrectionLog[]> {
  const { data } = await api.get<AttendanceCorrectionLog[]>(
    `/attendance/records/${attendanceRecordId}/corrections`,
  );

  return data;
}

export async function upsertAttendanceDayStatus(
  payload: UpsertAttendanceDayStatusPayload,
): Promise<AttendanceDayStatus> {
  const { data } = await api.post<AttendanceDayStatus>(
    '/attendance/day-status',
    payload,
  );

  return data;
}

export async function resolveAttendanceDayStatus(
  attendanceDayStatusId: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(
    `/attendance/day-status/${attendanceDayStatusId}`,
  );

  return data;
}
