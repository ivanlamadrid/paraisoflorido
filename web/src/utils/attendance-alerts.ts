import type { AttendanceAlertType } from 'src/types/attendance';

export function getAttendanceAlertTone(alertType: AttendanceAlertType): {
  color: string;
  textColor: string;
  icon: string;
} {
  if (alertType === 'consecutive_absences') {
    return {
      color: 'red-1',
      textColor: 'red-10',
      icon: 'event_busy',
    };
  }

  if (alertType === 'repeated_incomplete_records') {
    return {
      color: 'amber-1',
      textColor: 'amber-10',
      icon: 'rule',
    };
  }

  return {
    color: 'orange-1',
    textColor: 'orange-10',
    icon: 'schedule',
  };
}

export function getAttendanceAlertLabel(alertType: AttendanceAlertType): string {
  if (alertType === 'consecutive_absences') {
    return 'Ausencias consecutivas';
  }

  if (alertType === 'repeated_incomplete_records') {
    return 'Registros incompletos';
  }

  return 'Tardanzas repetidas';
}
