import { StudentEnrollmentMovement } from '../../common/enums/student-enrollment-movement.enum';
import { StudentEnrollmentStatus } from '../../common/enums/student-enrollment-status.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

export class StudentEnrollmentResponseDto {
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
