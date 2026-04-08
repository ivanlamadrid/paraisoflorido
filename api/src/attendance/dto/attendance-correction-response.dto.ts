import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';

export class AttendanceCorrectionSnapshotDto {
  markedAt: string;
  markedTime: string;
  status: AttendanceRecordStatus;
  observation: string | null;
}

export class AttendanceCorrectionLogResponseDto {
  id: string;
  attendanceRecordId: string;
  studentId: string;
  attendanceDate: string;
  markType: AttendanceMarkType;
  reason: string;
  correctedByUserId: string;
  correctedByDisplayName: string;
  correctedAt: string;
  previousData: AttendanceCorrectionSnapshotDto;
  nextData: AttendanceCorrectionSnapshotDto;
}
