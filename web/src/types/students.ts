import type {
  AttendanceAlert,
  AttendanceDayStatus,
  AttendanceHistoryItem,
  DailyAttendanceMark,
  StudentShift,
} from 'src/types/attendance';
export type StudentEnrollmentStatus =
  | 'active'
  | 'observed'
  | 'promoted'
  | 'graduated'
  | 'withdrawn'
  | 'transferred';

export type StudentInstitutionalStatus = StudentEnrollmentStatus | 'inactive';
export type StudentEnrollmentMovement =
  | 'continuity'
  | 'new_admission'
  | 'transfer_in'
  | 'transfer_out'
  | 'withdrawal';
export type StudentFollowUpRecordType = 'tutorial_note' | 'incident';
export type StudentFollowUpCategory =
  | 'attendance'
  | 'coexistence'
  | 'family'
  | 'risk'
  | 'support';
export type StudentFollowUpStatus = 'open' | 'in_progress' | 'closed';

export interface StudentSummary {
  id: string;
  userId: string;
  username: string;
  code: string;
  document: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  institutionalStatus: StudentInstitutionalStatus;
  schoolYear: number | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  enrollmentStatus: StudentEnrollmentStatus | null;
  currentSituation: StudentSituation | null;
}

export interface StudentsQuery {
  schoolYear?: number;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentsListResponse {
  items: StudentSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentEnrollmentSummary {
  id: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
  status: StudentEnrollmentStatus;
  movementType: StudentEnrollmentMovement;
  administrativeDetail: string | null;
  statusChangedAt: string | null;
  statusChangedByUserId: string | null;
  statusChangedByDisplayName: string | null;
  isActive: boolean;
}

export interface StudentDetail extends StudentSummary {
  enrollments: StudentEnrollmentSummary[];
  todayStatus: StudentTodayAttendanceStatus;
  recentSummary: StudentRecentAttendanceSummary;
  recentItems: AttendanceHistoryItem[];
  alerts: AttendanceAlert[];
  changeLogs: StudentChangeLog[];
  contacts: StudentContact[];
  consent: StudentConsent | null;
  followUps: StudentFollowUp[];
}

export interface CreateStudentPayload {
  code: string;
  firstName: string;
  lastName: string;
  document?: string | null;
  grade: number;
  section: string;
  shift: StudentShift;
  isActive: boolean;
  schoolYear?: number;
}

export interface UpdateStudentPayload {
  firstName: string;
  lastName: string;
  document?: string | null;
  grade: number;
  section: string;
  shift: StudentShift;
  isActive: boolean;
  schoolYear?: number;
}

export type StudentProfile = StudentSummary;

export interface StudentContact {
  id: string;
  fullName: string;
  relationship: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  address: string | null;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isAuthorizedToCoordinate: boolean;
  isAuthorizedToPickUp: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentContactPayload {
  fullName: string;
  relationship: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  email?: string | null;
  address?: string | null;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  isAuthorizedToCoordinate?: boolean;
  isAuthorizedToPickUp?: boolean;
  notes?: string | null;
}

export interface UpdateStudentContactPayload {
  fullName?: string;
  relationship?: string;
  phonePrimary?: string;
  phoneSecondary?: string | null;
  email?: string | null;
  address?: string | null;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  isAuthorizedToCoordinate?: boolean;
  isAuthorizedToPickUp?: boolean;
  notes?: string | null;
}

export interface StudentSituation {
  schoolYear: number;
  status: StudentEnrollmentStatus;
  movementType: StudentEnrollmentMovement;
  administrativeDetail: string | null;
  statusChangedAt: string | null;
  statusChangedByUserId: string | null;
  statusChangedByDisplayName: string | null;
}

export interface UpdateStudentSituationPayload {
  status: StudentEnrollmentStatus;
  movementType: StudentEnrollmentMovement;
  administrativeDetail?: string | null;
  schoolYear?: number;
}

export interface StudentConsent {
  imageConsentGranted: boolean | null;
  recordedAt: string | null;
  recordedByUserId: string | null;
  recordedByDisplayName: string | null;
  observation: string | null;
}

export interface UpdateStudentConsentPayload {
  imageConsentGranted: boolean;
  observation?: string | null;
}

export interface StudentFollowUp {
  id: string;
  recordType: StudentFollowUpRecordType;
  category: StudentFollowUpCategory | null;
  incidentType: string | null;
  recordedAt: string;
  note: string;
  actionsTaken: string | null;
  status: StudentFollowUpStatus;
  externalReference: string | null;
  authorUserId: string;
  authorDisplayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentFollowUpPayload {
  recordType: StudentFollowUpRecordType;
  category?: StudentFollowUpCategory;
  incidentType?: string | null;
  recordedAt: string;
  note: string;
  actionsTaken?: string | null;
  status: StudentFollowUpStatus;
  externalReference?: string | null;
}

export interface UpdateStudentFollowUpPayload {
  category?: StudentFollowUpCategory;
  incidentType?: string | null;
  recordedAt?: string;
  note?: string;
  actionsTaken?: string | null;
  status?: StudentFollowUpStatus;
  externalReference?: string | null;
}

export interface StudentFollowUpOverviewItem extends StudentFollowUp {
  studentId: string;
  studentCode: string;
  studentFullName: string;
  schoolYear: number;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
}

export interface StudentFollowUpOverviewQuery {
  schoolYear?: number;
  recordType?: StudentFollowUpRecordType;
  status?: StudentFollowUpStatus;
  grade?: number;
  section?: string;
  shift?: StudentShift;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentFollowUpOverviewResponse {
  items: StudentFollowUpOverviewItem[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentTodayAttendanceStatus {
  attendanceDate: string;
  operationalStatus: string;
  absence: AttendanceDayStatus | null;
  entry: DailyAttendanceMark | null;
  exit: DailyAttendanceMark | null;
}

export interface StudentRecentAttendanceSummary {
  periodStart: string;
  periodEnd: string;
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

export type StudentChangeType =
  | 'student_created'
  | 'profile_updated'
  | 'enrollment_updated'
  | 'status_updated'
  | 'consent_updated'
  | 'contact_created'
  | 'contact_updated'
  | 'contact_deactivated';

export interface StudentChangeLog {
  id: string;
  schoolYear: number | null;
  changeType: StudentChangeType;
  changedAt: string;
  changedByUserId: string;
  changedByDisplayName: string;
  previousData: Record<string, unknown> | null;
  nextData: Record<string, unknown> | null;
}
