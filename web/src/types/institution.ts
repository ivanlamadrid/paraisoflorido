import type { StudentShift } from 'src/types/attendance';

export interface InstitutionSettings {
  schoolName: string;
  activeSchoolYear: number;
  enabledTurns: StudentShift[];
  enabledGrades: number[];
  sectionsByGrade: Record<string, string[]>;
  hasInitialStudentPasswordConfigured: boolean;
  initialStudentPasswordUpdatedAt: string | null;
  updatedPendingInitialStudentPasswordsCount?: number | null;
}

export interface UpdateInstitutionSettingsPayload {
  schoolName: string;
  activeSchoolYear: number;
  enabledTurns: StudentShift[];
  enabledGrades: number[];
  sectionsByGrade: Record<string, string[]>;
  newInitialStudentPassword?: string;
}

export interface SchoolYearPreparationPreviewPayload {
  targetSchoolYear: number;
  resetStudentPasswords?: boolean;
}

export interface SchoolYearPreparationPreview {
  currentSchoolYear: number;
  targetSchoolYear: number;
  canPrepare: boolean;
  resetStudentPasswords: boolean;
  totalCurrentEnrollments: number;
  continuedStudentsCount: number;
  graduatedStudentsCount: number;
  skippedStudentsCount: number;
  passwordsResetCount: number;
  sectionAdjustmentsCount: number;
  shiftAdjustmentsCount: number;
  blockers: string[];
  notes: string[];
}

export interface ExecuteSchoolYearPreparationPayload
  extends SchoolYearPreparationPreviewPayload {
  currentPassword: string;
  confirmationText: string;
}

export interface ExecuteSchoolYearPreparationResponse {
  message: string;
  executedAt: string;
  logId: string;
  preview: SchoolYearPreparationPreview;
  settings: InstitutionSettings;
}
