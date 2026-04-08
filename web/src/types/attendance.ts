export type AttendanceMarkType = 'entry' | 'exit';
export type AttendanceSource = 'qr' | 'manual';
export type StudentShift = 'morning' | 'afternoon';
export type AttendanceRecordStatus = 'regular' | 'late' | 'early_departure';
export type AttendanceDayStatusType =
  | 'justified_absence'
  | 'unjustified_absence';
export type AttendanceExportFormat = 'csv' | 'xlsx';
export type AttendanceAlertType =
  | 'consecutive_absences'
  | 'repeated_incomplete_records'
  | 'repeated_late_entries';
export type AttendanceRegularizationItemType =
  | 'pending_entry'
  | 'pending_exit'
  | 'late_entry_review'
  | 'pending_justification'
  | 'recent_correction'
  | 'high_alert_recurrence';

export interface AttendanceContext {
  attendanceDate: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
}

export interface AttendanceHistoryItem {
  itemType: 'mark' | 'absence';
  attendanceDate: string;
  markType: AttendanceMarkType | null;
  status: AttendanceRecordStatus | AttendanceDayStatusType;
  markedAt: string | null;
  source: AttendanceSource | null;
  observation: string | null;
}

export interface AttendanceHistoryResponse {
  items: AttendanceHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AttendanceHistoryQuery {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceRecordResponse extends AttendanceContext {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  markType: AttendanceMarkType;
  status: AttendanceRecordStatus;
  source: AttendanceSource;
  markedAt: string;
  recordedByUserId: string;
  observation: string | null;
}

export interface AttendanceOfflineContextStudent {
  studentId: string;
  code: string;
  fullName: string;
  grade: number;
  section: string;
  shift: StudentShift;
}

export interface AttendanceOfflineContextClassroom {
  grade: number;
  section: string;
  shift: StudentShift;
  totalStudents: number;
}

export interface AttendanceOfflineContextResponse {
  context: {
    schoolYear: number;
    attendanceDate: string;
    generatedAt: string;
  };
  classrooms: AttendanceOfflineContextClassroom[];
  students: AttendanceOfflineContextStudent[];
}

export type AttendanceOfflineSyncItemStatus =
  | 'accepted'
  | 'duplicate'
  | 'rejected';

export interface AttendanceOfflineSyncItemPayload {
  clientId: string;
  source: AttendanceSource;
  studentId?: string | undefined;
  studentCode?: string | undefined;
  attendanceDate: string;
  markedAt: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
  markType: AttendanceMarkType;
  status?: AttendanceRecordStatus | undefined;
  observation?: string | undefined;
}

export interface AttendanceOfflineSyncItemResult {
  clientId: string;
  status: AttendanceOfflineSyncItemStatus;
  message: string;
  record: AttendanceRecordResponse | null;
}

export interface AttendanceOfflineSyncResponse {
  summary: {
    totalItems: number;
    acceptedItems: number;
    duplicateItems: number;
    rejectedItems: number;
  };
  items: AttendanceOfflineSyncItemResult[];
}

export interface DailyAttendanceMark {
  id: string;
  markedAt: string;
  status: AttendanceRecordStatus;
  source: AttendanceSource;
  observation: string | null;
  recordedByUserId: string;
}

export interface AttendanceDayStatus {
  id: string;
  statusType: AttendanceDayStatusType;
  observation: string | null;
  recordedByUserId: string;
  createdAt: string;
}

export interface DailyAttendanceItem {
  studentId: string;
  code: string;
  fullName: string;
  isActive: boolean;
  absence: AttendanceDayStatus | null;
  entry: DailyAttendanceMark | null;
  exit: DailyAttendanceMark | null;
}

export interface DailyAttendanceSummary {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  entriesRegistered: number;
  exitsRegistered: number;
  lateEntries: number;
  earlyDepartures: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absences: number;
  pendingEntries: number;
  pendingExits: number;
  incompleteRecords: number;
}

export interface DailyAttendanceResponse {
  context: AttendanceContext;
  summary: DailyAttendanceSummary;
  items: DailyAttendanceItem[];
}

export interface AttendanceAlert {
  alertType: AttendanceAlertType;
  studentId: string;
  studentCode: string;
  fullName: string;
  document: string | null;
  grade: number;
  section: string;
  shift: StudentShift;
  count: number;
  threshold: number;
  title: string;
  description: string;
  recentDates: string[];
}

export interface AttendanceAlertsSummary {
  totalAlerts: number;
  studentsWithAlerts: number;
  consecutiveAbsenceAlerts: number;
  repeatedIncompleteRecordAlerts: number;
  repeatedLateEntryAlerts: number;
}

export interface AttendanceAlertsResponse {
  summary: AttendanceAlertsSummary;
  items: AttendanceAlert[];
}

export interface AttendanceRegularizationItem {
  itemType: AttendanceRegularizationItemType;
  studentId: string;
  studentCode: string;
  fullName: string;
  document: string | null;
  attendanceDate: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
  statusLabel: string;
  observation: string | null;
  supportLabel: string | null;
}

export interface AttendanceRegularizationSummary {
  pendingEntries: number;
  pendingExits: number;
  lateEntriesForReview: number;
  pendingJustifications: number;
  recentCorrections: number;
  studentsWithRecurringAlerts: number;
  totalItems: number;
}

export interface AttendanceRegularizationResponse {
  context: {
    schoolYear: number;
    from: string;
    to: string;
    grade: number | null;
    section: string | null;
    shift: StudentShift | null;
    search: string | null;
  };
  summary: AttendanceRegularizationSummary;
  items: AttendanceRegularizationItem[];
}

export interface MonthlyAttendanceReportContext {
  schoolYear: number;
  month: string;
  monthLabel: string;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  schoolDays: number;
}

export interface MonthlyAttendanceReportSummary {
  totalStudents: number;
  schoolDays: number;
  expectedStudentDays: number;
  attendedStudentDays: number;
  attendancePercentage: number;
  entriesRegistered: number;
  exitsRegistered: number;
  lateEntries: number;
  earlyDepartures: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absences: number;
  incompleteRecords: number;
  classroomsCount: number;
}

export interface MonthlyAttendanceClassroomItem {
  grade: number;
  section: string;
  shift: StudentShift;
  totalStudents: number;
  schoolDays: number;
  attendancePercentage: number;
  attendedStudentDays: number;
  entriesRegistered: number;
  exitsRegistered: number;
  lateEntries: number;
  earlyDepartures: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absences: number;
  incompleteRecords: number;
}

export interface MonthlyAttendanceStudentItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  document: string | null;
  grade: number;
  section: string;
  shift: StudentShift;
  schoolDays: number;
  attendedDays: number;
  completeDays: number;
  attendancePercentage: number;
  entriesRegistered: number;
  exitsRegistered: number;
  lateEntries: number;
  earlyDepartures: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absences: number;
  incompleteRecords: number;
}

export interface MonthlyAttendanceReportResponse {
  context: MonthlyAttendanceReportContext;
  summary: MonthlyAttendanceReportSummary;
  classroomItems: MonthlyAttendanceClassroomItem[];
  studentItems: MonthlyAttendanceStudentItem[];
}

export type DailyAttendanceQuery = AttendanceContext;

export interface AttendanceAlertsQuery {
  schoolYear: number;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  search?: string;
  limit?: number;
}

export interface AttendanceRegularizationQuery {
  schoolYear: number;
  from: string;
  to: string;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  search?: string;
  limit?: number;
}

export interface AttendanceExportQuery {
  schoolYear: number;
  attendanceDate?: string;
  from?: string;
  to?: string;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  format: AttendanceExportFormat;
}

export interface MonthlyAttendanceReportQuery {
  schoolYear: number;
  month: string;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  search?: string;
}

export interface AttendanceRegistrationContext extends AttendanceContext {
  markType: AttendanceMarkType;
}

export interface RegisterAttendanceByScanPayload {
  studentCode: string;
  markType: AttendanceMarkType;
  observation?: string;
}

export interface RegisterAttendanceManualPayload
  extends AttendanceRegistrationContext {
  studentId: string;
  status?: AttendanceRecordStatus;
  observation?: string;
}

export interface UpdateAttendanceRecordPayload {
  markedTime: string;
  status?: AttendanceRecordStatus;
  observation?: string | null;
  reason: string;
  schoolYear?: number;
  grade?: number;
  section?: string;
  shift?: StudentShift;
}

export interface AttendanceCorrectionSnapshot {
  markedAt: string;
  markedTime: string;
  status: AttendanceRecordStatus;
  observation: string | null;
}

export interface AttendanceCorrectionLog {
  id: string;
  attendanceRecordId: string;
  studentId: string;
  attendanceDate: string;
  markType: AttendanceMarkType;
  reason: string;
  correctedByUserId: string;
  correctedByDisplayName: string;
  correctedAt: string;
  previousData: AttendanceCorrectionSnapshot;
  nextData: AttendanceCorrectionSnapshot;
}

export interface UpsertAttendanceDayStatusPayload extends AttendanceContext {
  studentId: string;
  statusType: AttendanceDayStatusType;
  observation?: string | null;
}
