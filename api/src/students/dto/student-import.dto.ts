import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeCode(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function normalizeDocument(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export type StudentImportIssueCode =
  | 'incomplete'
  | 'invalid_code'
  | 'duplicate_code'
  | 'duplicate_document'
  | 'invalid_grade'
  | 'invalid_section'
  | 'invalid_shift';

export type StudentImportPreviewRowDto = {
  rowNumber: number;
  code: string | null;
  firstName: string;
  lastName: string;
  document: string | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  isActive: boolean;
  isValid: boolean;
  issues: Array<{
    code: StudentImportIssueCode;
    message: string;
  }>;
};

export type StudentImportPreviewResponseDto = {
  fileName: string;
  sheetName: string;
  schoolYear: number;
  importToken: string;
  expiresAt: string;
  rows: StudentImportPreviewRowDto[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    rowsWithoutCode: number;
    rowsWithDuplicateCode: number;
    rowsWithDuplicateDocument: number;
    rowsWithInvalidClassroomData: number;
    rowsWithIncompleteData: number;
  };
};

export type StudentImportResultResponseDto = {
  schoolYear: number;
  summary: {
    receivedRows: number;
    importedRows: number;
    skippedRows: number;
    generatedCodes: number;
  };
  imported: Array<{
    rowNumber: number;
    studentId: string;
    code: string;
    fullName: string;
  }>;
  skipped: Array<{
    rowNumber: number;
    fullName: string;
    reason: string;
  }>;
};

export class ImportStudentRowDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  rowNumber?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code?: string;

  @Transform(({ value }) => normalizeName(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;

  @Transform(({ value }) => normalizeName(value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName: string;

  @Transform(({ value }) => normalizeDocument(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string | null;

  @IsInt()
  @Min(1)
  @Max(5)
  grade: number;

  @Transform(({ value }) => normalizeSection(value))
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  section: string;

  @IsEnum(StudentShift)
  shift: StudentShift;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class ImportStudentsDto {
  @IsUUID()
  importToken: string;
}
