import { StudentEnrollmentMovement } from '../../common/enums/student-enrollment-movement.enum';
import { StudentEnrollmentStatus } from '../../common/enums/student-enrollment-status.enum';
import { StudentFollowUpCategory } from '../../common/enums/student-follow-up-category.enum';
import { StudentFollowUpRecordType } from '../../common/enums/student-follow-up-record-type.enum';
import { StudentFollowUpStatus } from '../../common/enums/student-follow-up-status.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import {
  AttendanceAlertItemDto,
  AttendanceDayStatusDto,
  DailyAttendanceMarkDto,
} from '../../attendance/dto/attendance-response.dto';
import { AttendanceDayStatusType } from '../../common/enums/attendance-day-status-type.enum';
import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';
import { AttendanceSource } from '../../common/enums/attendance-source.enum';
import { StudentContactResponseDto } from './student-contact.dto';
import { StudentEnrollmentResponseDto } from './student-enrollment-response.dto';

export class StudentResponseDto {
  id: string;
  userId: string;
  username: string;
  code: string;
  document: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  institutionalStatus: string;
  schoolYear: number | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  enrollmentStatus: StudentEnrollmentStatus | null;
  currentSituation: StudentSituationResponseDto | null;
}

export class StudentDetailResponseDto extends StudentResponseDto {
  enrollments: StudentEnrollmentResponseDto[];
  todayStatus: StudentTodayAttendanceStatusDto;
  recentSummary: StudentRecentAttendanceSummaryDto;
  recentItems: StudentRecentAttendanceItemDto[];
  alerts: AttendanceAlertItemDto[];
  changeLogs: StudentChangeLogResponseDto[];
  contacts: StudentContactResponseDto[];
  consent: StudentConsentResponseDto | null;
  followUps: StudentFollowUpResponseDto[];
}

export class StudentSituationResponseDto {
  schoolYear: number;
  status: StudentEnrollmentStatus;
  movementType: StudentEnrollmentMovement;
  administrativeDetail: string | null;
  statusChangedAt: string | null;
  statusChangedByUserId: string | null;
  statusChangedByDisplayName: string | null;
}

export class StudentConsentResponseDto {
  imageConsentGranted: boolean | null;
  recordedAt: string | null;
  recordedByUserId: string | null;
  recordedByDisplayName: string | null;
  observation: string | null;
}

export class StudentFollowUpResponseDto {
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

export class StudentFollowUpOverviewItemResponseDto extends StudentFollowUpResponseDto {
  studentId: string;
  studentCode: string;
  studentFullName: string;
  schoolYear: number;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
}

export class StudentFollowUpOverviewResponseDto {
  items: StudentFollowUpOverviewItemResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export class StudentTodayAttendanceStatusDto {
  attendanceDate: string;
  operationalStatus: string;
  absence: AttendanceDayStatusDto | null;
  entry: DailyAttendanceMarkDto | null;
  exit: DailyAttendanceMarkDto | null;
}

export class StudentRecentAttendanceSummaryDto {
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

export class StudentRecentAttendanceItemDto {
  itemType: 'mark' | 'absence';
  attendanceDate: string;
  markType: AttendanceMarkType | null;
  status: AttendanceRecordStatus | AttendanceDayStatusType;
  markedAt: string | null;
  source: AttendanceSource | null;
  observation: string | null;
}

export class StudentChangeLogResponseDto {
  id: string;
  schoolYear: number | null;
  changeType: string;
  changedAt: string;
  changedByUserId: string;
  changedByDisplayName: string;
  previousData: Record<string, unknown> | null;
  nextData: Record<string, unknown> | null;
}
