import { AttendanceDayStatusType } from '../../common/enums/attendance-day-status-type.enum';
import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';
import { AttendanceSource } from '../../common/enums/attendance-source.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

export class AttendanceRecordResponseDto {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  attendanceDate: string;
  markType: AttendanceMarkType;
  status: AttendanceRecordStatus;
  source: AttendanceSource;
  markedAt: string;
  recordedByUserId: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
  observation: string | null;
}

export class AttendanceOfflineContextStudentDto {
  studentId: string;
  code: string;
  fullName: string;
  grade: number;
  section: string;
  shift: StudentShift;
}

export class AttendanceOfflineContextClassroomDto {
  grade: number;
  section: string;
  shift: StudentShift;
  totalStudents: number;
}

export class AttendanceOfflineContextResponseDto {
  context: {
    schoolYear: number;
    attendanceDate: string;
    generatedAt: string;
  };
  classrooms: AttendanceOfflineContextClassroomDto[];
  students: AttendanceOfflineContextStudentDto[];
}

export type AttendanceOfflineSyncItemStatusDto =
  | 'accepted'
  | 'duplicate'
  | 'rejected';

export class AttendanceOfflineSyncItemResultDto {
  clientId: string;
  status: AttendanceOfflineSyncItemStatusDto;
  message: string;
  record: AttendanceRecordResponseDto | null;
}

export class AttendanceOfflineSyncSummaryDto {
  totalItems: number;
  acceptedItems: number;
  duplicateItems: number;
  rejectedItems: number;
}

export class AttendanceOfflineSyncResponseDto {
  summary: AttendanceOfflineSyncSummaryDto;
  items: AttendanceOfflineSyncItemResultDto[];
}

export interface DailyAttendanceMarkDto {
  id: string;
  markedAt: string;
  status: AttendanceRecordStatus;
  source: AttendanceSource;
  observation: string | null;
  recordedByUserId: string;
}

export interface AttendanceDayStatusDto {
  id: string;
  statusType: AttendanceDayStatusType;
  observation: string | null;
  recordedByUserId: string;
  createdAt: string;
}

export class DailyAttendanceItemDto {
  studentId: string;
  code: string;
  fullName: string;
  isActive: boolean;
  absence: AttendanceDayStatusDto | null;
  entry: DailyAttendanceMarkDto | null;
  exit: DailyAttendanceMarkDto | null;
}

export class DailyAttendanceSummaryDto {
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

export class DailyAttendanceResponseDto {
  context: {
    attendanceDate: string;
    schoolYear: number;
    grade: number;
    section: string;
    shift: StudentShift;
  };
  summary: DailyAttendanceSummaryDto;
  items: DailyAttendanceItemDto[];
}

export enum AttendanceAlertTypeDto {
  CONSECUTIVE_ABSENCES = 'consecutive_absences',
  REPEATED_INCOMPLETE_RECORDS = 'repeated_incomplete_records',
  REPEATED_LATE_ENTRIES = 'repeated_late_entries',
}

export class AttendanceAlertItemDto {
  alertType: AttendanceAlertTypeDto;
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

export class AttendanceAlertsSummaryDto {
  totalAlerts: number;
  studentsWithAlerts: number;
  consecutiveAbsenceAlerts: number;
  repeatedIncompleteRecordAlerts: number;
  repeatedLateEntryAlerts: number;
}

export class AttendanceAlertsResponseDto {
  summary: AttendanceAlertsSummaryDto;
  items: AttendanceAlertItemDto[];
}

export enum AttendanceRegularizationItemTypeDto {
  PENDING_ENTRY = 'pending_entry',
  PENDING_EXIT = 'pending_exit',
  LATE_ENTRY_REVIEW = 'late_entry_review',
  PENDING_JUSTIFICATION = 'pending_justification',
  RECENT_CORRECTION = 'recent_correction',
  HIGH_ALERT_RECURRENCE = 'high_alert_recurrence',
}

export class AttendanceRegularizationItemDto {
  itemType: AttendanceRegularizationItemTypeDto;
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

export class AttendanceRegularizationSummaryDto {
  pendingEntries: number;
  pendingExits: number;
  lateEntriesForReview: number;
  pendingJustifications: number;
  recentCorrections: number;
  studentsWithRecurringAlerts: number;
  totalItems: number;
}

export class AttendanceRegularizationResponseDto {
  context: {
    schoolYear: number;
    from: string;
    to: string;
    grade: number | null;
    section: string | null;
    shift: StudentShift | null;
    search: string | null;
  };
  summary: AttendanceRegularizationSummaryDto;
  items: AttendanceRegularizationItemDto[];
}

export class MonthlyAttendanceReportSummaryDto {
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

export class MonthlyAttendanceClassroomItemDto {
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

export class MonthlyAttendanceStudentItemDto {
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

export class MonthlyAttendanceReportResponseDto {
  context: {
    schoolYear: number;
    month: string;
    monthLabel: string;
    grade: number | null;
    section: string | null;
    shift: StudentShift | null;
    schoolDays: number;
  };
  summary: MonthlyAttendanceReportSummaryDto;
  classroomItems: MonthlyAttendanceClassroomItemDto[];
  studentItems: MonthlyAttendanceStudentItemDto[];
  studentPage: number;
  studentLimit: number;
  studentTotal: number;
}

export class MyAttendanceHistoryItemDto {
  itemType: 'mark' | 'absence';
  attendanceDate: string;
  markType: AttendanceMarkType | null;
  status: AttendanceRecordStatus | AttendanceDayStatusType;
  markedAt: string | null;
  source: AttendanceSource | null;
  observation: string | null;
}

export class MyAttendanceHistoryResponseDto {
  items: MyAttendanceHistoryItemDto[];
  total: number;
  page: number;
  limit: number;
}
