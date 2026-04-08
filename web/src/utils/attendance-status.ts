import type {
  AttendanceDayStatusType,
  AttendanceRecordStatus,
} from 'src/types/attendance';

export function getAttendanceRecordStatusLabel(
  status: AttendanceRecordStatus,
): string {
  switch (status) {
    case 'late':
      return 'Tardanza';
    case 'early_departure':
      return 'Salida anticipada';
    default:
      return 'Regular';
  }
}

export function getAttendanceDayStatusLabel(
  statusType: AttendanceDayStatusType,
): string {
  return statusType === 'justified_absence'
    ? 'Ausencia justificada'
    : 'Ausencia no justificada';
}

export function getAttendanceRecordStatusTone(
  status: AttendanceRecordStatus,
): { color: string; textColor: string } {
  switch (status) {
    case 'late':
      return { color: 'amber-1', textColor: 'amber-10' };
    case 'early_departure':
      return { color: 'deep-orange-1', textColor: 'deep-orange-10' };
    default:
      return { color: 'green-1', textColor: 'positive' };
  }
}

export function getAttendanceDayStatusTone(
  statusType: AttendanceDayStatusType,
): { color: string; textColor: string } {
  return statusType === 'justified_absence'
    ? { color: 'blue-1', textColor: 'blue-10' }
    : { color: 'red-1', textColor: 'red-10' };
}
