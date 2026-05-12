function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  return false;
}

export const attendanceFeatures = {
  exitEnabled: parseBooleanFlag(import.meta.env.VITE_ATTENDANCE_EXIT_ENABLED),
} as const;

export const isAttendanceExitEnabled = attendanceFeatures.exitEnabled;
