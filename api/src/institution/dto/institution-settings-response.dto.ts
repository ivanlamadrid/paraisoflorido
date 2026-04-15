import { StudentShift } from '../../common/enums/student-shift.enum';

export class InstitutionSettingsResponseDto {
  schoolName: string;
  activeSchoolYear: number;
  enabledTurns: StudentShift[];
  enabledGrades: number[];
  sectionsByGrade: Record<string, string[]>;
  hasInitialStudentPasswordConfigured: boolean;
  initialStudentPasswordUpdatedAt: string | null;
  updatedPendingInitialStudentPasswordsCount?: number | null;
}
